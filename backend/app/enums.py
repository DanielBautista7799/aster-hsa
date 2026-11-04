"""Fixed vocabularies used by the models, schemas and services.

StrEnum values are plain strings, so they serialise to JSON and store in
PostgreSQL VARCHAR columns (guarded by CHECK constraints) without any
conversion code.
"""

from enum import StrEnum


class TransactionType(StrEnum):
    DEPOSIT = "deposit"
    PURCHASE = "purchase"


class TransactionStatus(StrEnum):
    APPROVED = "approved"
    DECLINED = "declined"


class DeclineReason(StrEnum):
    """Stable, machine-readable reasons a purchase was declined."""

    CARD_REQUIRED = "card_required"
    CARD_FROZEN = "card_frozen"
    INELIGIBLE_EXPENSE = "ineligible_expense"
    INSUFFICIENT_FUNDS = "insufficient_funds"


class CardStatus(StrEnum):
    ACTIVE = "active"
    FROZEN = "frozen"


class MerchantCategory(StrEnum):
    """Merchant categories the simulator understands.

    Whether each one is HSA-eligible lives in app/services/eligibility.py.
    """

    PHARMACY = "pharmacy"
    HOSPITAL = "hospital"
    CLINIC = "clinic"
    DENTAL = "dental"
    VISION = "vision"
    RESTAURANT = "restaurant"
    ELECTRONICS = "electronics"
    GROCERY = "grocery"
    CLOTHING = "clothing"


def sql_in_list(enum_class: type[StrEnum]) -> str:
    """Render enum values for a SQL CHECK constraint: 'a', 'b', 'c'."""
    return ", ".join(f"'{member.value}'" for member in enum_class)
