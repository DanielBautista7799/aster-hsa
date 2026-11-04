"""Simplified HSA eligibility rules.

IMPORTANT: this is a demonstration rule, not tax advice. Real HSA eligibility
depends on what was bought (IRS Publication 502), not on the merchant type.
A merchant category is only a convenient proxy for this simulation.

The rule is a plain lookup table so it is easy to read, test and change.
Every MerchantCategory must appear here; a category missing from the table is
treated as NOT eligible, so nothing is ever approved by accident.
"""

from dataclasses import dataclass

from app.enums import MerchantCategory


@dataclass(frozen=True)
class CategoryRule:
    label: str
    eligible: bool
    description: str


CATEGORY_RULES: dict[MerchantCategory, CategoryRule] = {
    # Qualified medical expense categories (from the assignment, plus
    # three illustrative healthcare categories).
    MerchantCategory.PHARMACY: CategoryRule("Pharmacy", True, "Prescriptions and pharmacy care"),
    MerchantCategory.HOSPITAL: CategoryRule("Hospital", True, "Hospital and emergency services"),
    MerchantCategory.CLINIC: CategoryRule("Clinic", True, "Doctor visits and urgent care"),
    MerchantCategory.DENTAL: CategoryRule("Dental", True, "Dentists and orthodontists"),
    MerchantCategory.VISION: CategoryRule("Vision", True, "Eye exams, glasses and contacts"),
    # Not qualified medical expenses in this simulation.
    MerchantCategory.RESTAURANT: CategoryRule("Restaurant", False, "Restaurants and food delivery"),
    MerchantCategory.ELECTRONICS: CategoryRule("Electronics", False, "Phones, computers and gadgets"),
    MerchantCategory.GROCERY: CategoryRule("Grocery", False, "Supermarkets and groceries"),
    MerchantCategory.CLOTHING: CategoryRule("Clothing", False, "Apparel and accessories"),
}


def is_qualified_medical_expense(category: MerchantCategory) -> bool:
    """Return True only for categories explicitly marked eligible."""
    rule = CATEGORY_RULES.get(category)
    return rule is not None and rule.eligible
