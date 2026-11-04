"""Simulated card purchases: the core of the concurrency guarantee.

How a purchase is processed (all inside ONE database transaction):

1. Lock the account row (404 if missing), then load its card.
2. Decide if the purchase can be attempted: a card must exist and be active,
   and the merchant category must be a qualified medical expense.
3. If so, debit with a single conditional UPDATE:

       UPDATE accounts
          SET balance_cents = balance_cents - :amount
        WHERE id = :account_id AND balance_cents >= :amount
    RETURNING balance_cents;

   The UPDATE checks and debits in one atomic step: `balance_cents >= :amount`
   is evaluated against the latest committed balance, so with $100 and
   simultaneous $80 and $50 charges exactly one matches and the other updates
   zero rows. Zero rows means "insufficient funds" and nothing is debited.
4. Insert the approved/declined history row and COMMIT. The balance change and
   its history row are committed together, or (on any error) rolled back
   together. We only return a response after the commit succeeds.

Why lock the account row in step 1 as well? The conditional UPDATE alone
already prevents overspending. The lock additionally makes every operation on
one account (purchases, declines and deposits) take turns, so the balance we
record on a DECLINED row is exact and the history reads as a clean chain:
each row's balance_after = previous row's balance_after +/- its amount.
Without it, a decline could record a balance read while another request was
mid-flight. Different accounts never block each other.

The CHECK (balance_cents >= 0) constraint on accounts is a further line of
defence: even a buggy UPDATE could never store a negative balance.
"""

import uuid
from dataclasses import dataclass

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.enums import CardStatus, DeclineReason, TransactionStatus, TransactionType
from app.errors import NotFoundError
from app.models import Account, Card, Transaction
from app.schemas.transaction import PurchaseCreate
from app.services.eligibility import is_qualified_medical_expense

DECLINE_MESSAGES: dict[DeclineReason, str] = {
    DeclineReason.CARD_REQUIRED: "Declined: issue a virtual card before making purchases.",
    DeclineReason.CARD_FROZEN: "Declined: this card is frozen. Unfreeze it to make purchases.",
    DeclineReason.INELIGIBLE_EXPENSE: (
        "Declined: this merchant category is not a qualified medical expense. No money was taken."
    ),
    DeclineReason.INSUFFICIENT_FUNDS: ("Declined: insufficient funds for this purchase. No money was taken."),
}


@dataclass
class PurchaseOutcome:
    transaction: Transaction
    balance_cents: int
    message: str


def process_purchase(db: Session, account_id: uuid.UUID, purchase: PurchaseCreate) -> PurchaseOutcome:
    # FOR NO KEY UPDATE: the row lock an UPDATE would take, acquired up front.
    # Concurrent requests for this account wait here until we commit.
    current_balance = db.scalar(
        select(Account.balance_cents).where(Account.id == account_id).with_for_update(key_share=True)
    )
    if current_balance is None:
        raise NotFoundError("Account not found.")

    # FOR SHARE locks the card row until we commit, so a concurrent "freeze"
    # waits for in-flight purchases instead of slipping in between our status
    # check and the debit. Many purchases can hold FOR SHARE at the same time.
    card = db.scalar(select(Card).where(Card.account_id == account_id).with_for_update(read=True))

    decline_reason = _pre_debit_decline_reason(card, purchase)
    new_balance: int | None = None

    if decline_reason is None:
        new_balance = _debit_if_sufficient_funds(db, account_id, purchase.amount_cents)
        if new_balance is None:
            decline_reason = DeclineReason.INSUFFICIENT_FUNDS

    if decline_reason is not None:
        # Nothing was debited. We hold the account lock, so this is exact.
        new_balance = current_balance

    purchase_row = Transaction(
        account_id=account_id,
        card_id=card.id if card is not None else None,
        type=TransactionType.PURCHASE,
        amount_cents=purchase.amount_cents,
        merchant_name=purchase.merchant_name,
        merchant_category=purchase.merchant_category,
        status=TransactionStatus.DECLINED if decline_reason else TransactionStatus.APPROVED,
        decline_reason=decline_reason,
        balance_after_cents=new_balance,
    )
    db.add(purchase_row)
    db.commit()  # the debit (if any) and the history row are saved together

    if decline_reason is None:
        message = f"Approved: qualified medical expense at {purchase.merchant_name}."
    else:
        message = DECLINE_MESSAGES[decline_reason]
    return PurchaseOutcome(transaction=purchase_row, balance_cents=new_balance, message=message)


def _pre_debit_decline_reason(card: Card | None, purchase: PurchaseCreate) -> DeclineReason | None:
    """Rules that can be checked without touching the balance."""
    if card is None:
        return DeclineReason.CARD_REQUIRED
    if card.status != CardStatus.ACTIVE:
        return DeclineReason.CARD_FROZEN
    if not is_qualified_medical_expense(purchase.merchant_category):
        return DeclineReason.INELIGIBLE_EXPENSE
    return None


def _debit_if_sufficient_funds(db: Session, account_id: uuid.UUID, amount_cents: int) -> int | None:
    """Atomically subtract `amount_cents` if (and only if) the balance covers it.

    Returns the new balance, or None when the balance was too low (no row
    matched the WHERE clause, so nothing changed).
    """
    return db.execute(
        update(Account)
        .where(Account.id == account_id, Account.balance_cents >= amount_cents)
        .values(balance_cents=Account.balance_cents - amount_cents)
        .returning(Account.balance_cents),
        execution_options={"synchronize_session": False},
    ).scalar_one_or_none()
