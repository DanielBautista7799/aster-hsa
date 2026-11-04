"""Reading transaction history: filters, search and cursor pagination.

History is read newest-first and paged with a *keyset cursor* rather than
page numbers. The cursor identifies the last row of the previous page by its
(created_at, id); the next page is simply "rows older than that". Unlike
OFFSET paging, rows inserted while someone is paging never cause duplicates
or gaps, because every page is defined relative to a fixed row, not a count.
"""

import base64
import binascii
import uuid
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import ColumnElement, func, or_, select, tuple_
from sqlalchemy.orm import Session

from app.enums import TransactionStatus, TransactionType
from app.errors import InvalidCursorError
from app.models import Transaction
from app.services.account_service import get_account

DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 200


@dataclass
class TransactionPage:
    items: list[Transaction]
    # Pass this back as ?cursor= to get the next (older) page; None on the last page.
    next_cursor: str | None
    # Rows matching the filters across ALL pages, so the UI can say "25 of 143".
    total_count: int


def list_transactions(
    db: Session,
    account_id: uuid.UUID,
    type_filter: TransactionType | None = None,
    status_filter: TransactionStatus | None = None,
    search: str | None = None,
    limit: int = DEFAULT_PAGE_SIZE,
    cursor: str | None = None,
) -> TransactionPage:
    """One page of an account's history, newest first."""
    get_account(db, account_id)  # 404 if the account does not exist

    conditions: list[ColumnElement[bool]] = [Transaction.account_id == account_id]
    if type_filter is not None:
        conditions.append(Transaction.type == type_filter)
    if status_filter is not None:
        conditions.append(Transaction.status == status_filter)
    if search:
        conditions.append(_search_condition(search))

    total_count = db.scalar(select(func.count()).select_from(Transaction).where(*conditions))

    statement = select(Transaction).where(*conditions)
    if cursor is not None:
        cursor_created_at, cursor_id = decode_cursor(cursor)
        # Row-value comparison: strictly "before" the cursor row in our sort order.
        statement = statement.where(
            tuple_(Transaction.created_at, Transaction.id) < tuple_(cursor_created_at, cursor_id)
        )
    # created_at can tie (rows written in the same instant), so id makes the
    # order deterministic; the cursor compares on the same pair.
    statement = statement.order_by(Transaction.created_at.desc(), Transaction.id.desc())

    # Ask for one extra row: if it exists there is another page.
    rows = list(db.scalars(statement.limit(limit + 1)))
    has_more = len(rows) > limit
    items = rows[:limit]
    next_cursor = encode_cursor(items[-1]) if has_more else None
    return TransactionPage(items=items, next_cursor=next_cursor, total_count=total_count or 0)


def _search_condition(search: str) -> ColumnElement[bool]:
    """Case-insensitive 'contains' match on the fields people search for.

    Decline reasons are stored as codes like 'insufficient_funds'; replacing
    the underscore lets a search for "insufficient funds" find them.
    """
    pattern = f"%{_escape_like(search)}%"
    return or_(
        Transaction.merchant_name.ilike(pattern, escape="\\"),
        Transaction.merchant_category.ilike(pattern, escape="\\"),
        func.replace(Transaction.decline_reason, "_", " ").ilike(pattern, escape="\\"),
        Transaction.type.ilike(pattern, escape="\\"),
    )


def _escape_like(text: str) -> str:
    """Treat %, _ and \\ in user input literally inside a LIKE pattern."""
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


# ------------------------------------------------------------------ cursors
#
# A cursor is the (created_at, id) of a row, encoded as URL-safe base64 of
# "<ISO timestamp>|<uuid>". It is opaque to clients but easy to inspect when
# debugging. It carries no secrets: it only positions a query that is always
# scoped to the account in the URL.


def encode_cursor(row: Transaction) -> str:
    raw = f"{row.created_at.isoformat()}|{row.id}"
    return base64.urlsafe_b64encode(raw.encode()).decode()


def decode_cursor(cursor: str) -> tuple[datetime, uuid.UUID]:
    try:
        timestamp_text, id_text = base64.urlsafe_b64decode(cursor.encode()).decode().split("|")
        created_at = datetime.fromisoformat(timestamp_text)
        if created_at.tzinfo is None:
            raise ValueError("cursor timestamp must be timezone-aware")
        return created_at, uuid.UUID(id_text)
    except (ValueError, binascii.Error, UnicodeDecodeError) as error:
        raise InvalidCursorError(
            "The pagination cursor is not valid. Request the first page again without a cursor."
        ) from error
