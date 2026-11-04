"""Concurrency Lab: creates an isolated, funded sandbox account.

The browser then fires several purchases at this account at the same moment
through the normal purchase endpoint, so the race runs through exactly the
same code path as any other purchase. Lab accounts are flagged is_lab and
hidden from the account list, so a demo never touches a real account.
"""

import secrets

from sqlalchemy.orm import Session

from app.models import Account, Card
from app.services.account_service import create_account, deposit
from app.services.card_service import issue_card


def create_lab_account(db: Session, starting_balance_cents: int) -> tuple[Account, Card]:
    run_id = secrets.token_hex(4)
    account = create_account(
        db,
        full_name=f"Concurrency Lab {run_id.upper()}",
        # .invalid is a reserved top-level domain, so this can never be a real address.
        email=f"lab-{run_id}@lab.aster.invalid",
        is_lab=True,
    )
    deposit(db, account.id, starting_balance_cents)
    card, _created = issue_card(db, account.id)
    db.refresh(account)
    return account, card
