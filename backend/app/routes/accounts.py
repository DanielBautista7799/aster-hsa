import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.account import AccountCreate, AccountDetail, AccountRead
from app.services import account_service

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


@router.get("", response_model=list[AccountRead], summary="List accounts")
def list_accounts(db: Session = Depends(get_db)):
    return account_service.list_accounts(db)


@router.post(
    "",
    response_model=AccountRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create an account with a $0 balance",
    responses={409: {"description": "An account with this email already exists"}},
)
def create_account(payload: AccountCreate, db: Session = Depends(get_db)):
    return account_service.create_account(db, payload.full_name, payload.email)


@router.get(
    "/{account_id}",
    response_model=AccountDetail,
    summary="Account details, current balance and history-derived totals",
)
def get_account(account_id: uuid.UUID, db: Session = Depends(get_db)):
    # REPEATABLE READ: the balance and the totals below come from several
    # queries; this makes them all read the same snapshot, so
    # balance == deposited - spent holds even while other requests commit.
    db.connection(execution_options={"isolation_level": "REPEATABLE READ"})
    account = account_service.get_account(db, account_id)
    summary = account_service.get_account_summary(db, account_id)
    return AccountDetail(**AccountRead.model_validate(account).model_dump(), summary=summary)
