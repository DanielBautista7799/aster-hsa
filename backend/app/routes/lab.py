from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import MAX_DEPOSIT_CENTS
from app.database import get_db
from app.schemas.account import AccountRead
from app.schemas.card import CardRead
from app.schemas.common import RequestModel, cents_field
from app.services import lab_service

router = APIRouter(prefix="/api/lab", tags=["concurrency lab"])


class LabAccountCreate(RequestModel):
    starting_balance_cents: cents_field(MAX_DEPOSIT_CENTS, "Opening balance for the sandbox.") = 10_000


class LabAccountRead(BaseModel):
    account: AccountRead
    card: CardRead


@router.post(
    "/accounts",
    response_model=LabAccountRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create an isolated, funded sandbox account with an active card",
    description=(
        "Used by the Concurrency Lab page. The sandbox is a real account (hidden "
        "from GET /api/accounts) so concurrent purchases against it run through the "
        "normal purchase endpoint."
    ),
)
def create_lab_account(payload: LabAccountCreate, db: Session = Depends(get_db)):
    account, card = lab_service.create_lab_account(db, payload.starting_balance_cents)
    return LabAccountRead(account=account, card=card)
