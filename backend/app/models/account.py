import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    String,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Account(Base):
    """An HSA account holder and their current available balance.

    balance_cents is the single source of truth for available money. It is only
    ever changed with atomic SQL UPDATE statements (see app/services), and the
    CHECK constraint below makes a negative balance impossible even if a bug
    slipped into application code.
    """

    __tablename__ = "accounts"
    __table_args__ = (
        CheckConstraint("balance_cents >= 0", name="ck_accounts_balance_nonnegative"),
        CheckConstraint("email = lower(email)", name="ck_accounts_email_lowercase"),
        CheckConstraint("length(trim(full_name)) > 0", name="ck_accounts_full_name_not_blank"),
        # Named explicitly: account_service maps this exact constraint to a 409.
        UniqueConstraint("email", name="accounts_email_key"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    # Stored lower-cased (normalised by the service) and unique.
    email: Mapped[str] = mapped_column(String(254), nullable=False)
    balance_cents: Mapped[int] = mapped_column(
        BigInteger, nullable=False, default=0, server_default=text("0")
    )
    # Accounts created by the Concurrency Lab are isolated sandboxes. They are
    # real accounts (so the race runs through the normal purchase code) but are
    # hidden from the account switcher so they never mix with real demo data.
    is_lab: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
