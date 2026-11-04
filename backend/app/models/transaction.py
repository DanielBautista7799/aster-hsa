import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Uuid,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.enums import DeclineReason, TransactionStatus, TransactionType, sql_in_list


class Transaction(Base):
    """An append-only history row for every deposit and purchase attempt.

    Declined purchases are recorded too, so the history explains exactly what
    happened and why. A row is always written in the same database transaction
    as the balance change it describes, so the two can never disagree.
    """

    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint("amount_cents > 0", name="ck_transactions_amount_positive"),
        CheckConstraint("balance_after_cents >= 0", name="ck_transactions_balance_after_nonnegative"),
        CheckConstraint(f"type IN ({sql_in_list(TransactionType)})", name="ck_transactions_type"),
        CheckConstraint(f"status IN ({sql_in_list(TransactionStatus)})", name="ck_transactions_status"),
        CheckConstraint(
            f"decline_reason IS NULL OR decline_reason IN ({sql_in_list(DeclineReason)})",
            name="ck_transactions_decline_reason",
        ),
        # A declined row must say why; an approved row must not carry a reason.
        CheckConstraint(
            "(status = 'declined') = (decline_reason IS NOT NULL)",
            name="ck_transactions_reason_matches_status",
        ),
        # Deposits have no card or merchant and are always approved.
        CheckConstraint(
            "type <> 'deposit' OR (card_id IS NULL AND merchant_name IS NULL"
            " AND merchant_category IS NULL AND status = 'approved')",
            name="ck_transactions_deposit_shape",
        ),
        # Purchases always name a merchant and category.
        CheckConstraint(
            "type <> 'purchase' OR (merchant_name IS NOT NULL AND merchant_category IS NOT NULL)",
            name="ck_transactions_purchase_shape",
        ),
        # History is always read "newest first for one account".
        Index("ix_transactions_account_created", "account_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("accounts.id", ondelete="RESTRICT"), nullable=False
    )
    # NULL for deposits, and for purchases attempted before a card was issued.
    card_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("cards.id", ondelete="RESTRICT"), nullable=True
    )
    type: Mapped[str] = mapped_column(String(16), nullable=False)
    amount_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    merchant_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    merchant_category: Mapped[str | None] = mapped_column(String(32), nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    decline_reason: Mapped[str | None] = mapped_column(String(32), nullable=True)
    # The account balance immediately after this row was processed. For a
    # declined purchase this equals the (unchanged) balance at decision time.
    balance_after_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    # clock_timestamp() is the moment the row is inserted. now() would be the
    # start of the database transaction, which for a purchase that waited on a
    # row lock is earlier than when it was actually decided.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("clock_timestamp()")
    )
