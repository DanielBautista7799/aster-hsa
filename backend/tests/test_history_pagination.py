"""Cursor pagination and search for GET /api/accounts/{id}/transactions."""

import base64

import pytest
from sqlalchemy import text

from app.database import SessionLocal
from app.services.transaction_service import decode_cursor, encode_cursor
from tests.conftest import create_account, deposit, funded_account_with_card, purchase


def history(client, account_id, **params) -> dict:
    params = {key: value for key, value in params.items() if value is not None}
    response = client.get(f"/api/accounts/{account_id}/transactions", params=params)
    assert response.status_code == 200, response.text
    return response.json()


def walk_all_pages(client, account_id, **params) -> list[dict]:
    """Follow next_cursor until it is null; return every row seen, in order."""
    rows, cursor, pages = [], None, 0
    while True:
        page = history(client, account_id, cursor=cursor, **params)
        rows.extend(page["items"])
        pages += 1
        assert pages < 100, "pagination never terminated"
        cursor = page["next_cursor"]
        if cursor is None:
            return rows


def account_with_deposits(client, count: int, email="pages@example.com") -> str:
    account = create_account(client, email=email)
    for cents in range(1, count + 1):
        deposit(client, account["id"], cents)  # amounts 1..count make rows easy to identify
    return account["id"]


# ------------------------------------------------------------ page walking


def test_pages_cover_every_row_exactly_once_in_order(client):
    account_id = account_with_deposits(client, 30)

    first = history(client, account_id, limit=7)
    assert len(first["items"]) == 7
    assert first["total_count"] == 30
    assert first["next_cursor"] is not None

    rows = walk_all_pages(client, account_id, limit=7)
    assert len(rows) == 30
    assert len({row["id"] for row in rows}) == 30  # no duplicates
    assert [row["amount_cents"] for row in rows] == list(range(30, 0, -1))  # newest first, no gaps


def test_last_page_has_no_cursor_even_when_exactly_full(client):
    account_id = account_with_deposits(client, 10)
    page = history(client, account_id, limit=10)
    assert len(page["items"]) == 10
    assert page["next_cursor"] is None


def test_empty_history_is_an_empty_page(client):
    account = create_account(client)
    assert history(client, account["id"]) == {"items": [], "next_cursor": None, "total_count": 0}


def test_total_count_reflects_filters_not_the_page(client):
    account_id = funded_account_with_card(client, 100_000)
    for _ in range(6):
        purchase(client, account_id, 1_000, "pharmacy")
    for _ in range(4):
        purchase(client, account_id, 1_000, "restaurant")

    page = history(client, account_id, status="declined", limit=3)
    assert len(page["items"]) == 3
    assert page["total_count"] == 4
    assert all(row["status"] == "declined" for row in page["items"])


def test_rows_added_while_paging_do_not_shift_later_pages(client):
    """With OFFSET paging a new row would push an old row from page 1 onto
    page 2 (a duplicate). With a cursor, page 2 is still 'older than the last
    row of page 1', so the new row only appears on a fresh page 1."""
    account_id = account_with_deposits(client, 10)
    page_one = history(client, account_id, limit=4)
    seen = {row["id"] for row in page_one["items"]}

    new_row = deposit(client, account_id, 999)["transaction"]  # arrives mid-walk

    page_two = history(client, account_id, limit=4, cursor=page_one["next_cursor"])
    assert new_row["id"] not in {row["id"] for row in page_two["items"]}
    assert seen.isdisjoint(row["id"] for row in page_two["items"])
    assert [row["amount_cents"] for row in page_two["items"]] == [6, 5, 4, 3]

    # ...but the new row is the newest thing on a fresh first page.
    assert history(client, account_id, limit=1)["items"][0]["id"] == new_row["id"]


def test_filters_are_combined_with_the_cursor(client):
    account_id = funded_account_with_card(client, 100_000)
    for index in range(9):
        purchase(client, account_id, 1_000, "pharmacy" if index % 3 else "restaurant")

    declined = walk_all_pages(client, account_id, status="declined", limit=2)
    assert len(declined) == 3
    assert all(row["decline_reason"] == "ineligible_expense" for row in declined)

    approved_purchases = walk_all_pages(client, account_id, type="purchase", status="approved", limit=4)
    assert len(approved_purchases) == 6


def test_rows_with_identical_timestamps_are_paged_without_loss(client):
    """created_at can tie exactly; the id tie-breaker must keep paging exact."""
    account_id = account_with_deposits(client, 6)
    with SessionLocal() as db:
        db.execute(
            text("UPDATE transactions SET created_at = '2026-01-01T12:00:00+00:00' WHERE account_id = :id"),
            {"id": account_id},
        )
        db.commit()

    rows = walk_all_pages(client, account_id, limit=2)
    assert len(rows) == 6
    assert len({row["id"] for row in rows}) == 6


# ------------------------------------------------------------------ search


def test_search_matches_merchant_category_reason_and_type_case_insensitively(client):
    account_id = funded_account_with_card(client, 10_000)
    purchase(client, account_id, 1_000, "pharmacy", "Northside Pharmacy")
    purchase(client, account_id, 500, "restaurant", "Blue Fern Bistro")
    purchase(client, account_id, 50_000, "hospital", "Lakeside Medical")

    assert [r["merchant_name"] for r in history(client, account_id, q="BISTRO")["items"]] == [
        "Blue Fern Bistro"
    ]
    assert [r["merchant_name"] for r in history(client, account_id, q="pharm")["items"]] == [
        "Northside Pharmacy"
    ]
    assert history(client, account_id, q="deposit")["total_count"] == 1
    # Reason codes are matched in readable form: "insufficient funds" finds insufficient_funds.
    assert [r["merchant_name"] for r in history(client, account_id, q="insufficient funds")["items"]] == [
        "Lakeside Medical"
    ]
    assert [r["merchant_name"] for r in history(client, account_id, q="ineligible")["items"]] == [
        "Blue Fern Bistro"
    ]
    assert history(client, account_id, q="zzz")["items"] == []


def test_search_treats_like_wildcards_literally(client):
    account_id = funded_account_with_card(client, 10_000)
    purchase(client, account_id, 100, "pharmacy", "100% Wellness")
    purchase(client, account_id, 100, "pharmacy", "Plain Pharmacy")

    assert history(client, account_id, q="%")["total_count"] == 1  # only the merchant with a literal %
    assert history(client, account_id, q="_")["total_count"] == 0
    assert (
        history(client, account_id, q="   ")["total_count"] == 3
    )  # blank search = no filter (1 deposit + 2 purchases)


def test_search_combines_with_filters_and_paging(client):
    account_id = funded_account_with_card(client, 100_000)
    for index in range(7):
        purchase(client, account_id, 1_000, "pharmacy", f"Corner Pharmacy {index}")
    purchase(client, account_id, 1_000, "restaurant", "Corner Cafe")

    rows = walk_all_pages(client, account_id, q="corner", status="approved", limit=3)
    assert len(rows) == 7
    assert all(row["merchant_name"].startswith("Corner Pharmacy") for row in rows)


# ------------------------------------------------------------- validation


def test_blank_cursor_and_search_mean_first_page_unfiltered(client):
    account_id = account_with_deposits(client, 3)
    page = history(client, account_id, cursor="", q="")
    assert len(page["items"]) == 3 and page["total_count"] == 3


@pytest.mark.parametrize("params", [{"limit": 0}, {"limit": 201}, {"limit": "ten"}, {"q": "x" * 81}])
def test_invalid_limit_or_search_is_422(client, params):
    account = create_account(client)
    assert client.get(f"/api/accounts/{account['id']}/transactions", params=params).status_code == 422


@pytest.mark.parametrize(
    "cursor",
    [
        "not-base64!",
        base64.urlsafe_b64encode(b"garbage").decode(),
        base64.urlsafe_b64encode(b"2026-01-01T00:00:00+00:00|not-a-uuid").decode(),
        base64.urlsafe_b64encode(
            b"2026-01-01T00:00:00|11111111-1111-1111-1111-111111111111"
        ).decode(),  # naive time
        base64.urlsafe_b64encode(b"\xff\xfe").decode(),
    ],
)
def test_invalid_cursor_is_422_with_a_helpful_message(client, cursor):
    account = create_account(client)
    response = client.get(f"/api/accounts/{account['id']}/transactions", params={"cursor": cursor})
    assert response.status_code == 422
    assert "cursor" in response.json()["detail"].lower()


def test_cursor_round_trips(client):
    account_with_deposits(client, 1)
    with SessionLocal() as db:
        row = db.execute(text("SELECT id, created_at FROM transactions LIMIT 1")).one()
    cursor = encode_cursor(row)
    assert decode_cursor(cursor) == (row.created_at, row.id)
    assert "=" not in cursor or cursor.endswith("=")  # URL-safe alphabet, padding only at the end
