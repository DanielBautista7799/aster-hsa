import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.transaction import PurchaseCreate, TransactionResult
from app.services import purchase_service

router = APIRouter(prefix="/api/accounts/{account_id}/purchases", tags=["purchases"])


@router.post(
    "",
    response_model=TransactionResult,
    status_code=status.HTTP_201_CREATED,
    summary="Simulate a card purchase",
    description=(
        "Every well-formed purchase attempt is recorded. A declined purchase is a "
        "normal business outcome, not an HTTP error: the response is still 201 and "
        "`transaction.status` / `transaction.decline_reason` explain the result. "
        "Malformed input returns 422 and records nothing."
    ),
)
def create_purchase(account_id: uuid.UUID, payload: PurchaseCreate, db: Session = Depends(get_db)):
    outcome = purchase_service.process_purchase(db, account_id, payload)
    return TransactionResult(
        transaction=outcome.transaction,
        balance_cents=outcome.balance_cents,
        message=outcome.message,
    )
