import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import RequestModel, trimmed_text

# Deliberately simple: something@something.tld, no spaces. Real systems would
# confirm ownership by sending a verification email.

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")




# Account deletion is intentionally unsupported to preserve financial records
# and transaction history. ON DELETE RESTRICT enforces this at the database level.
# A production system would close accounts instead of deleting them.

class AccountCreate(RequestModel):
    full_name: trimmed_text(1, 120) = Field(description="Account holder's full name.")
    email: trimmed_text(3, 254) = Field(description="Unique contact email (case-insensitive).")

    @field_validator("full_name")
    @classmethod
    def collapse_inner_whitespace(cls, value: str) -> str:
        return " ".join(value.split())

    @field_validator("email")
    @classmethod
    def normalise_email(cls, value: str) -> str:
        email = value.lower()
        if not EMAIL_PATTERN.match(email):
            raise ValueError("Enter a valid email address, like name@example.com.")
        return email


class AccountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    email: str
    balance_cents: int
    created_at: datetime


class CategorySpend(BaseModel):
    category: str
    approved_cents: int
    approved_count: int


class AccountSummary(BaseModel):
    """Totals derived from the account's transaction history (never invented)."""

    total_deposited_cents: int
    total_spent_cents: int
    approved_purchase_count: int
    declined_purchase_count: int
    transaction_count: int
    spending_by_category: list[CategorySpend]


class AccountDetail(AccountRead):
    summary: AccountSummary
