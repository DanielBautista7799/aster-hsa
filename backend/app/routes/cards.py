import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.card import CardRead, CardStatusUpdate
from app.services import card_service

router = APIRouter(prefix="/api/accounts/{account_id}/cards", tags=["cards"])


@router.get(
    "",
    response_model=CardRead | None,
    summary="Get the account's virtual demo card (null if none issued yet)",
    description=(
        "Not having a card yet is a normal state, so it returns 200 with `null` rather than an error."
    ),
    responses={404: {"description": "Account not found"}},
)
def get_card(account_id: uuid.UUID, db: Session = Depends(get_db)):
    return card_service.get_card(db, account_id)


@router.post(
    "",
    response_model=CardRead,
    status_code=status.HTTP_201_CREATED,
    summary="Issue the account's virtual demo card (idempotent)",
    description=(
        "Each account may have one card. Returns 201 when a card is issued, "
        "or 200 with the existing card if one was already issued."
    ),
)
def issue_card(account_id: uuid.UUID, response: Response, db: Session = Depends(get_db)):
    card, created = card_service.issue_card(db, account_id)
    if not created:
        response.status_code = status.HTTP_200_OK
    return card


@router.patch("", response_model=CardRead, summary="Freeze or unfreeze the card")
def update_card_status(account_id: uuid.UUID, payload: CardStatusUpdate, db: Session = Depends(get_db)):
    return card_service.set_card_status(db, account_id, payload.status)
