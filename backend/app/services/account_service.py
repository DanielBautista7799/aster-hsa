"""Account creation, lookup, summaries and deposits."""

import uuid

from sqlalchemy import case, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.enums import TransactionStatus, TransactionType
from app.errors import ConflictError, NotFoundError
from app.models import Account, Transaction
from app.schemas.account import AccountSummary, CategorySpend

# PostgreSQL's default name for UNIQUE(email) on accounts (see migration 0001).
EMAIL_UNIQUE_CONSTRAINT = "accounts_email_key"


def create_account(db: Session, full_name: str, email: str, is_lab: bool = False) -> Account:
    """Create an account with a $0 balance.

    `email` must already be normalised (trimmed + lower-cased) by the schema.
    The UNIQUE constraint on accounts.email is the real duplicate check: it is
    race-safe, unlike a "SELECT first, then INSERT" check in Python.
    """
    account = Account(full_name=full_name, email=email, balance_cents=0, is_lab=is_lab)
    db.add(account)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        if getattr(error.orig.diag, "constraint_name", None) == EMAIL_UNIQUE_CONSTRAINT:
            raise ConflictError(f"An account with the email {email} already exists.") from error
        raise  # any other constraint failure is a real bug, not a duplicate
    return account


def list_accounts(db: Session) -> list[Account]:
    """All regular (non-lab) accounts, oldest first so the order is stable."""
    statement = select(Account).where(Account.is_lab.is_(False)).order_by(Account.created_at, Account.id)
    return list(db.scalars(statement))


def get_account(db: Session, account_id: uuid.UUID) -> Account:
    account = db.get(Account, account_id)
    if account is None:
        raise NotFoundError("Account not found.")
    return account


def get_account_summary(db: Session, account_id: uuid.UUID) -> AccountSummary:
    """Totals computed by PostgreSQL from the transaction history."""
    is_approved = Transaction.status == TransactionStatus.APPROVED
    is_declined = Transaction.status == TransactionStatus.DECLINED
    is_deposit = Transaction.type == TransactionType.DEPOSIT
    is_purchase = Transaction.type == TransactionType.PURCHASE

    totals = db.execute(
        select(
            func.coalesce(func.sum(case((is_deposit & is_approved, Transaction.amount_cents))), 0),
            func.coalesce(func.sum(case((is_purchase & is_approved, Transaction.amount_cents))), 0),
            func.count().filter(is_purchase & is_approved),
            func.count().filter(is_purchase & is_declined),
            func.count(),
        ).where(Transaction.account_id == account_id)
    ).one()

    category_rows = db.execute(
        select(
            Transaction.merchant_category,
            func.sum(Transaction.amount_cents),
            func.count(),
        )
        .where(Transaction.account_id == account_id, is_purchase, is_approved)
        .group_by(Transaction.merchant_category)
        .order_by(func.sum(Transaction.amount_cents).desc())
    ).all()

    return AccountSummary(
        total_deposited_cents=int(totals[0]),
        total_spent_cents=int(totals[1]),
        approved_purchase_count=totals[2],
        declined_purchase_count=totals[3],
        transaction_count=totals[4],
        spending_by_category=[
            CategorySpend(category=category, approved_cents=int(cents), approved_count=count)
            for category, cents, count in category_rows
        ],
    )


def deposit(db: Session, account_id: uuid.UUID, amount_cents: int) -> Transaction:
    """Add money to an account and record the deposit, atomically.

    The balance is changed with `SET balance_cents = balance_cents + :amount`
    rather than reading the balance into Python and writing it back. PostgreSQL
    locks the row for the UPDATE, so two simultaneous deposits are both counted.
    The history row is inserted in the same database transaction, so either
    both the new balance and the history row are saved, or neither is.
    """
    new_balance = db.execute(
        update(Account)
        .where(Account.id == account_id)
        .values(balance_cents=Account.balance_cents + amount_cents)
        .returning(Account.balance_cents),
        # We read the new balance from RETURNING instead of from ORM objects.
        execution_options={"synchronize_session": False},
    ).scalar_one_or_none()

    if new_balance is None:
        db.rollback()
        raise NotFoundError("Account not found.")

    deposit_row = Transaction(
        account_id=account_id,
        type=TransactionType.DEPOSIT,
        amount_cents=amount_cents,
        status=TransactionStatus.APPROVED,
        balance_after_cents=new_balance,
    )
    db.add(deposit_row)
    db.commit()  # balance change + history row become visible together
    return deposit_row
