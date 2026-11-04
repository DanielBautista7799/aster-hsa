import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Uuid, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.enums import CardStatus, sql_in_list


class Card(Base):
    """A cosmetic virtual demo card. At most one per account.

    We deliberately do NOT generate or store a full card number (PAN), CVV or
    expiry date: last_four is four random digits used only for display.
    """

    __tablename__ = "cards"
    __table_args__ = (
        CheckConstraint(f"status IN ({sql_in_list(CardStatus)})", name="ck_cards_status"),
        CheckConstraint("last_four ~ '^[0-9]{4}$'", name="ck_cards_last_four_digits"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    # unique=True is what enforces "one card per account", even when two issue
    # requests race each other (see app/services/card_service.py).
    account_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("accounts.id", ondelete="RESTRICT"), nullable=False, unique=True
    )
    last_four: Mapped[str] = mapped_column(String(4), nullable=False)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default=CardStatus.ACTIVE, server_default=CardStatus.ACTIVE.value
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
