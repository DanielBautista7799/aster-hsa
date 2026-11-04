"""Virtual demo card issuance and freeze/unfreeze."""

import secrets
import uuid

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.enums import CardStatus
from app.errors import NotFoundError
from app.models import Card
from app.services.account_service import get_account


def get_card(db: Session, account_id: uuid.UUID) -> Card | None:
    """Return the account's card, or None if no card has been issued yet."""
    get_account(db, account_id)  # 404 if the account does not exist
    return db.scalar(select(Card).where(Card.account_id == account_id))


def issue_card(db: Session, account_id: uuid.UUID) -> tuple[Card, bool]:
    """Issue the account's single virtual card. Safe to call repeatedly.

    Returns (card, created). If a card already exists it is returned unchanged.

    We use INSERT ... ON CONFLICT (account_id) DO NOTHING so that the database's
    UNIQUE constraint decides the winner when two requests race. The loser's
    insert simply does nothing and it reads the winner's card instead, so there
    is never a duplicate card and never an unexpected 500 error.
    """
    get_account(db, account_id)  # 404 if the account does not exist

    # Four random digits for display only. secrets avoids predictable values.
    last_four = f"{secrets.randbelow(10_000):04d}"
    inserted_id = db.execute(
        insert(Card)
        .values(account_id=account_id, last_four=last_four, status=CardStatus.ACTIVE)
        .on_conflict_do_nothing(index_elements=[Card.account_id])
        .returning(Card.id)
    ).scalar_one_or_none()
    db.commit()

    card = db.scalar(select(Card).where(Card.account_id == account_id))
    return card, inserted_id is not None


def set_card_status(db: Session, account_id: uuid.UUID, status: CardStatus) -> Card:
    """Freeze or unfreeze the account's card."""
    card = get_card(db, account_id)
    if card is None:
        raise NotFoundError("This account does not have a card yet.")
    card.status = status
    db.commit()
    return card
