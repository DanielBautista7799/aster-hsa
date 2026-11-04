"""Initial schema: accounts, cards and transactions.

Revision ID: 0001
Revises:
Create Date: 2026-11-04 04:59:45.118745

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "accounts",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("balance_cents", sa.BigInteger(), server_default=sa.text("0"), nullable=False),
        sa.Column("is_lab", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("balance_cents >= 0", name="ck_accounts_balance_nonnegative"),
        sa.CheckConstraint("email = lower(email)", name="ck_accounts_email_lowercase"),
        sa.CheckConstraint("length(trim(full_name)) > 0", name="ck_accounts_full_name_not_blank"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email", name="accounts_email_key"),
    )
    op.create_table(
        "cards",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("account_id", sa.Uuid(), nullable=False),
        sa.Column("last_four", sa.String(length=4), nullable=False),
        sa.Column("status", sa.String(length=16), server_default="active", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("last_four ~ '^[0-9]{4}$'", name="ck_cards_last_four_digits"),
        sa.CheckConstraint("status IN ('active', 'frozen')", name="ck_cards_status"),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("account_id"),
    )
    op.create_table(
        "transactions",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("account_id", sa.Uuid(), nullable=False),
        sa.Column("card_id", sa.Uuid(), nullable=True),
        sa.Column("type", sa.String(length=16), nullable=False),
        sa.Column("amount_cents", sa.BigInteger(), nullable=False),
        sa.Column("merchant_name", sa.String(length=80), nullable=True),
        sa.Column("merchant_category", sa.String(length=32), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("decline_reason", sa.String(length=32), nullable=True),
        sa.Column("balance_after_cents", sa.BigInteger(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "(status = 'declined') = (decline_reason IS NOT NULL)",
            name="ck_transactions_reason_matches_status",
        ),
        sa.CheckConstraint(
            "decline_reason IS NULL OR decline_reason IN ('card_required', 'card_frozen', 'ineligible_expense', 'insufficient_funds')",
            name="ck_transactions_decline_reason",
        ),
        sa.CheckConstraint("status IN ('approved', 'declined')", name="ck_transactions_status"),
        sa.CheckConstraint(
            "type <> 'deposit' OR (card_id IS NULL AND merchant_name IS NULL AND merchant_category IS NULL AND status = 'approved')",
            name="ck_transactions_deposit_shape",
        ),
        sa.CheckConstraint(
            "type <> 'purchase' OR (merchant_name IS NOT NULL AND merchant_category IS NOT NULL)",
            name="ck_transactions_purchase_shape",
        ),
        sa.CheckConstraint("type IN ('deposit', 'purchase')", name="ck_transactions_type"),
        sa.CheckConstraint("amount_cents > 0", name="ck_transactions_amount_positive"),
        sa.CheckConstraint("balance_after_cents >= 0", name="ck_transactions_balance_after_nonnegative"),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["card_id"], ["cards.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_transactions_account_created", "transactions", ["account_id", "created_at"], unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_transactions_account_created", table_name="transactions")
    op.drop_table("transactions")
    op.drop_table("cards")
    op.drop_table("accounts")
