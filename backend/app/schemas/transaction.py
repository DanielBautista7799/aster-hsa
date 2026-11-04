import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.config import MAX_DEPOSIT_CENTS, MAX_PURCHASE_CENTS
from app.enums import DeclineReason, MerchantCategory, TransactionStatus, TransactionType
from app.schemas.common import RequestModel, cents_field, trimmed_text


class DepositCreate(RequestModel):
    amount_cents: cents_field(MAX_DEPOSIT_CENTS, "Deposit amount in cents, e.g. 50000 for $500.00.")


class PurchaseCreate(RequestModel):
    """A simulated card purchase. The account's issued card is used automatically."""

    merchant_name: trimmed_text(1, 80) = Field(description="Merchant shown on the receipt.")
    merchant_category: MerchantCategory = Field(
        description="Merchant category; decides HSA eligibility in this simulation."
    )
    amount_cents: cents_field(MAX_PURCHASE_CENTS, "Purchase amount in cents, e.g. 5000 for $50.00.")


class TransactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    account_id: uuid.UUID
    card_id: uuid.UUID | None
    type: TransactionType
    amount_cents: int
    merchant_name: str | None
    merchant_category: MerchantCategory | None
    status: TransactionStatus
    decline_reason: DeclineReason | None
    balance_after_cents: int
    created_at: datetime


class TransactionPage(BaseModel):
    """One page of history. Pass `next_cursor` back as `?cursor=` for the next page."""

    items: list[TransactionRead]
    next_cursor: str | None = Field(description="Cursor for the next (older) page, or null on the last page.")
    total_count: int = Field(description="Rows matching the filters across all pages.")


class TransactionResult(BaseModel):
    """Returned after a deposit or purchase: the recorded row plus the
    authoritative balance, so the UI never has to compute money itself."""

    transaction: TransactionRead
    balance_cents: int
    message: str


class MerchantCategoryRead(BaseModel):
    value: MerchantCategory
    label: str
    eligible: bool
    description: str
