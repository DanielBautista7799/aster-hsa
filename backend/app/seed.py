"""Idempotent demo data. Run with:  python -m app.seed

Creates a few fictional accounts so the app looks realistic immediately.
All data goes through the normal services (deposits, card issuance and
purchase processing), so balances always match their history.

Safe to run repeatedly: an account whose email already exists is skipped
entirely, so existing data is never modified.
"""

from sqlalchemy import select

from app.database import SessionLocal
from app.enums import CardStatus, MerchantCategory
from app.models import Account
from app.schemas.transaction import PurchaseCreate
from app.services import account_service, card_service, purchase_service

# Every person, email and merchant below is fictional. example.com is a
# reserved domain that can never belong to a real person.
DEMO_ACCOUNTS = [
    {
        "full_name": "Jordan Rivera",
        "email": "jordan.rivera@example.com",
        "deposits": [250_000, 120_000],
        "card": CardStatus.ACTIVE,
        "purchases": [
            ("Northside Pharmacy", MerchantCategory.PHARMACY, 4_250),
            ("Harbor Urgent Care", MerchantCategory.CLINIC, 15_000),
            ("Blue Fern Bistro", MerchantCategory.RESTAURANT, 6_840),
            ("Bright Smile Dental", MerchantCategory.DENTAL, 32_500),
            ("Volt Electronics", MerchantCategory.ELECTRONICS, 129_900),
            ("ClearView Optometry", MerchantCategory.VISION, 18_900),
            ("Lakeside Medical Center", MerchantCategory.HOSPITAL, 87_500),
            ("Northside Pharmacy", MerchantCategory.PHARMACY, 2_199),
            ("Lakeside Medical Center", MerchantCategory.HOSPITAL, 500_000),
        ],
    },
    {
        "full_name": "Priya Shah",
        "email": "priya.shah@example.com",
        "deposits": [40_000],
        "card": CardStatus.FROZEN,
        "purchases": [
            ("Greenway Pharmacy", MerchantCategory.PHARMACY, 2_875),
            ("Market Basket Grocers", MerchantCategory.GROCERY, 5_410),
        ],
    },
    {
        # No card yet: shows the "issue your card" state.
        "full_name": "Marcus Chen",
        "email": "marcus.chen@example.com",
        "deposits": [75_000],
        "card": None,
        "purchases": [],
    },
]


def seed() -> None:
    with SessionLocal() as db:
        for spec in DEMO_ACCOUNTS:
            exists = db.scalar(select(Account.id).where(Account.email == spec["email"]))
            if exists:
                print(f"skip   {spec['email']} (already exists)")
                continue

            account = account_service.create_account(db, spec["full_name"], spec["email"])
            for amount_cents in spec["deposits"]:
                account_service.deposit(db, account.id, amount_cents)

            if spec["card"] is not None:
                card_service.issue_card(db, account.id)
                for merchant_name, category, amount_cents in spec["purchases"]:
                    purchase = PurchaseCreate(
                        merchant_name=merchant_name, merchant_category=category, amount_cents=amount_cents
                    )
                    purchase_service.process_purchase(db, account.id, purchase)
                # Freeze only after purchases, so the history shows normal activity.
                if spec["card"] == CardStatus.FROZEN:
                    card_service.set_card_status(db, account.id, CardStatus.FROZEN)

            db.refresh(account)
            print(f"create {spec['email']} balance_cents={account.balance_cents}")


if __name__ == "__main__":
    seed()
