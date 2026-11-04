import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.transaction import DepositCreate, TransactionResult
from app.services import account_service
from app.utils import format_cents

router = APIRouter(prefix="/api/accounts/{account_id}/deposits", tags=["deposits"])


@router.post(
    "",
    response_model=TransactionResult,
    status_code=status.HTTP_201_CREATED,
    summary="Deposit funds (simulated, no real money moves)",
)
def create_deposit(account_id: uuid.UUID, payload: DepositCreate, db: Session = Depends(get_db)):
    deposit_row = account_service.deposit(db, account_id, payload.amount_cents)
    return TransactionResult(
        transaction=deposit_row,
        balance_cents=deposit_row.balance_after_cents,
        message=f"Deposited {format_cents(payload.amount_cents)}.",
    )
