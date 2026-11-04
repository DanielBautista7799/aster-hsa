"""Database-level safety nets and rollback behaviour."""

import pytest
from sqlalchemy import select, text, update
from sqlalchemy.exc import DBAPIError, IntegrityError

from app.database import SessionLocal
from app.enums import MerchantCategory
from app.models import Account, Card, Transaction
from app.schemas.transaction import PurchaseCreate
from app.services import account_service, card_service, purchase_service
from app.utils import format_cents


def new_account(db, balance_cents=10_000, email="integrity@example.com"):
    account = account_service.create_account(db, "Integrity Test", email)
    account_service.deposit(db, account.id, balance_cents)
    card_service.issue_card(db, account.id)
    return account.id


def test_failed_history_insert_rolls_back_the_debit(db):
    """If writing the history row fails AFTER the balance UPDATE ran, the debit
    must not survive. We bypass validation to send a merchant name longer than
    the column allows; PostgreSQL rejects the INSERT when commit() flushes it."""
    account_id = new_account(db)
    oversized = PurchaseCreate.model_construct(
        merchant_name="x" * 200, merchant_category=MerchantCategory.PHARMACY, amount_cents=4_000
    )

    with pytest.raises(DBAPIError):
        purchase_service.process_purchase(db, account_id, oversized)
    db.rollback()

    with SessionLocal() as fresh:
        assert fresh.scalar(select(Account.balance_cents).where(Account.id == account_id)) == 10_000
        purchases = fresh.scalars(
            select(Transaction).where(Transaction.account_id == account_id, Transaction.type == "purchase")
        ).all()
        assert purchases == []


def test_database_rejects_negative_balance_even_if_code_tried(db):
    account_id = new_account(db, balance_cents=1_000)
    with pytest.raises(IntegrityError, match="ck_accounts_balance_nonnegative"):
        db.execute(update(Account).where(Account.id == account_id).values(balance_cents=-1))
        db.commit()
    db.rollback()


def test_database_rejects_second_card_for_same_account(db):
    account_id = new_account(db)
    with pytest.raises(IntegrityError):
        db.add(Card(account_id=account_id, last_four="1234"))
        db.commit()
    db.rollback()


@pytest.mark.parametrize(
    "bad_sql",
    [
        # zero amount
        "INSERT INTO transactions (account_id, type, amount_cents, status, balance_after_cents)"
        " VALUES (:id, 'deposit', 0, 'approved', 0)",
        # declined without a reason
        "INSERT INTO transactions (account_id, type, amount_cents, merchant_name, merchant_category,"
        " status, balance_after_cents) VALUES (:id, 'purchase', 100, 'M', 'pharmacy', 'declined', 0)",
        # deposit with a merchant
        "INSERT INTO transactions"
        " (account_id, type, amount_cents, merchant_name, status, balance_after_cents)"
        " VALUES (:id, 'deposit', 100, 'M', 'approved', 0)",
        # unknown type
        "INSERT INTO transactions (account_id, type, amount_cents, status, balance_after_cents)"
        " VALUES (:id, 'refund', 100, 'approved', 0)",
    ],
)
def test_transaction_check_constraints(db, bad_sql):
    account_id = new_account(db)
    with pytest.raises(IntegrityError):
        db.execute(text(bad_sql), {"id": account_id})
        db.commit()
    db.rollback()


def test_email_must_be_stored_lowercase(db):
    with pytest.raises(IntegrityError):
        db.add(Account(full_name="Upper", email="Upper@Example.com"))
        db.commit()
    db.rollback()


@pytest.mark.parametrize(
    ("cents", "expected"),
    [
        (0, "$0.00"),
        (1, "$0.01"),
        (99, "$0.99"),
        (100, "$1.00"),
        (123_456, "$1,234.56"),
        (1_000_000, "$10,000.00"),
    ],
)
def test_format_cents(cents, expected):
    assert format_cents(cents) == expected
