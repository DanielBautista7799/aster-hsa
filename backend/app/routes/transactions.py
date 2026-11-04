import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.enums import TransactionStatus, TransactionType
from app.schemas.transaction import TransactionPage
from app.services import transaction_service
from app.services.transaction_service import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE

router = APIRouter(prefix="/api/accounts/{account_id}/transactions", tags=["transactions"])


@router.get(
    "",
    response_model=TransactionPage,
    summary="Transaction history, newest first, one page at a time",
    description=(
        "Returns up to `limit` rows plus `next_cursor`. Pass that value back as `?cursor=` "
        "to fetch the next (older) page; it is `null` on the last page. Filters and search "
        "must be repeated on every page request. `total_count` is the number of rows that "
        "match the filters across all pages."
    ),
    responses={422: {"description": "Invalid filter, limit or cursor"}},
)
def list_transactions(
    account_id: uuid.UUID,
    type: TransactionType | None = Query(default=None, description="Only deposits or purchases"),
    status: TransactionStatus | None = Query(default=None, description="Only approved or declined"),
    q: str | None = Query(
        default=None,
        max_length=80,
        description="Case-insensitive search on merchant name, category, decline reason or type",
    ),
    limit: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE, description="Page size"),
    cursor: str | None = Query(
        default=None, max_length=200, description="`next_cursor` from the previous page"
    ),
    db: Session = Depends(get_db),
):
    # One snapshot for the count and the page, so "25 of 143" is consistent
    # even while new transactions are being committed.
    db.connection(execution_options={"isolation_level": "REPEATABLE READ"})
    # A blank ?q= or ?cursor= means "no search" / "first page", not an error.
    search = q.strip() if q else None
    page = transaction_service.list_transactions(
        db, account_id, type, status, search or None, limit, cursor or None
    )
    return TransactionPage(items=page.items, next_cursor=page.next_cursor, total_count=page.total_count)
