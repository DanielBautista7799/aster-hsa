"""Real concurrency tests against PostgreSQL.

Every simulated request runs in its own thread with its OWN database session
(and therefore its own PostgreSQL connection), exactly like separate API
requests. A threading.Barrier releases all threads at the same instant so the
requests genuinely overlap instead of running one after another.
"""

import threading
import time
from concurrent.futures import ThreadPoolExecutor

import httpx2 as httpx
import pytest
import uvicorn
from sqlalchemy import select, text

from app.database import SessionLocal
from app.enums import MerchantCategory
from app.errors import ConflictError
from app.main import app
from app.models import Account, Card, Transaction
from app.schemas.transaction import PurchaseCreate
from app.services import account_service, card_service, purchase_service
from app.services.purchase_service import _debit_if_sufficient_funds


def make_funded_account(balance_cents: int, email: str = "race@example.com") -> str:
    with SessionLocal() as db:
        account = account_service.create_account(db, "Race Tester", email)
        if balance_cents:
            account_service.deposit(db, account.id, balance_cents)
        card_service.issue_card(db, account.id)
        return account.id


def run_concurrently(tasks):
    """Run callables at the same moment, each in its own thread. Returns results in order."""
    barrier = threading.Barrier(len(tasks))

    def wrapped(task):
        barrier.wait()  # everyone starts together
        return task()

    with ThreadPoolExecutor(max_workers=len(tasks)) as pool:
        futures = [pool.submit(wrapped, task) for task in tasks]
        return [future.result() for future in futures]


def purchase_in_new_session(account_id, amount_cents, category=MerchantCategory.PHARMACY):
    """One independent "request": its own session and connection."""

    def task():
        with SessionLocal() as db:
            request = PurchaseCreate(
                merchant_name="Race Pharmacy", merchant_category=category, amount_cents=amount_cents
            )
            outcome = purchase_service.process_purchase(db, account_id, request)
            return outcome.transaction.status, outcome.transaction.decline_reason, amount_cents

    return task


def stored_balance(account_id) -> int:
    with SessionLocal() as db:
        return db.scalar(select(Account.balance_cents).where(Account.id == account_id))


def assert_balance_matches_history(account_id):
    """The stored balance must equal approved deposits minus approved purchases,
    AND the history must form an exact chain: read oldest-first, every row's
    balance_after equals the previous row's balance_after plus/minus its own
    amount (unchanged for declines). This catches any row that recorded a
    balance it read while another request was mid-flight."""
    with SessionLocal() as db:
        rows = db.scalars(
            select(Transaction)
            .where(Transaction.account_id == account_id)
            .order_by(Transaction.created_at, Transaction.id)
        ).all()

    running = 0
    for row in rows:
        if row.status == "approved":
            running += row.amount_cents if row.type == "deposit" else -row.amount_cents
        assert row.balance_after_cents == running, (
            f"history chain broken at {row.type} {row.status} {row.amount_cents}: "
            f"recorded {row.balance_after_cents}, expected {running}"
        )
    assert stored_balance(account_id) == running


# The assignment's exact example, repeated to give races many chances to break.
@pytest.mark.parametrize("round_number", range(15))
def test_80_and_50_against_100_approves_exactly_one(round_number):
    account_id = make_funded_account(10_000, email=f"race{round_number}@example.com")

    results = run_concurrently(
        [purchase_in_new_session(account_id, 8_000), purchase_in_new_session(account_id, 5_000)]
    )

    approved = [amount for status, _, amount in results if status == "approved"]
    declined = [reason for status, reason, _ in results if status == "declined"]
    assert len(approved) == 1
    assert declined == ["insufficient_funds"]
    assert stored_balance(account_id) == 10_000 - approved[0]  # $20 or $50
    assert stored_balance(account_id) in (2_000, 5_000)
    assert_balance_matches_history(account_id)


def test_twenty_concurrent_10_dollar_purchases_against_100():
    account_id = make_funded_account(10_000)

    results = run_concurrently([purchase_in_new_session(account_id, 1_000) for _ in range(20)])

    statuses = [status for status, _, _ in results]
    assert statuses.count("approved") == 10
    assert statuses.count("declined") == 10
    assert stored_balance(account_id) == 0
    assert_balance_matches_history(account_id)


def test_concurrent_mix_of_eligible_and_ineligible_purchases():
    account_id = make_funded_account(10_000)
    tasks = [purchase_in_new_session(account_id, 3_000, MerchantCategory.PHARMACY) for _ in range(5)]
    tasks += [purchase_in_new_session(account_id, 3_000, MerchantCategory.RESTAURANT) for _ in range(5)]
    tasks += [purchase_in_new_session(account_id, 3_000, MerchantCategory.ELECTRONICS) for _ in range(5)]

    results = run_concurrently(tasks)

    # Only pharmacy purchases may ever debit; $100 covers three $30 purchases.
    approved = [r for r in results if r[0] == "approved"]
    assert len(approved) == 3
    ineligible = [r for r in results if r[1] == "ineligible_expense"]
    assert len(ineligible) == 10
    assert stored_balance(account_id) == 1_000
    assert_balance_matches_history(account_id)


def test_concurrent_deposits_are_all_counted():
    account_id = make_funded_account(0)

    def deposit_task():
        with SessionLocal() as db:
            account_service.deposit(db, account_id, 500)

    run_concurrently([deposit_task for _ in range(20)])
    assert stored_balance(account_id) == 10_000
    assert_balance_matches_history(account_id)


def test_concurrent_deposits_and_purchases_keep_balance_consistent():
    account_id = make_funded_account(5_000)

    def deposit_task():
        with SessionLocal() as db:
            account_service.deposit(db, account_id, 1_000)

    tasks = [deposit_task for _ in range(10)] + [
        purchase_in_new_session(account_id, 2_500) for _ in range(10)
    ]
    run_concurrently(tasks)

    assert stored_balance(account_id) >= 0
    assert_balance_matches_history(account_id)


def test_concurrent_declines_record_exact_balances():
    """Declines (ineligible and insufficient-funds) racing deposits and approved
    purchases must still record the exact balance at their turn."""
    account_id = make_funded_account(2_000)

    def deposit_task():
        with SessionLocal() as db:
            account_service.deposit(db, account_id, 3_000)

    tasks = [deposit_task for _ in range(8)]
    tasks += [purchase_in_new_session(account_id, 1_500, MerchantCategory.PHARMACY) for _ in range(8)]
    tasks += [purchase_in_new_session(account_id, 900, MerchantCategory.RESTAURANT) for _ in range(8)]
    tasks += [purchase_in_new_session(account_id, 50_000, MerchantCategory.HOSPITAL) for _ in range(4)]
    results = run_concurrently(tasks)

    purchase_results = [r for r in results if r is not None]  # deposit tasks return None
    assert [r[1] for r in purchase_results].count("ineligible_expense") == 8
    assert [r[1] for r in results[-4:]] == ["insufficient_funds"] * 4  # $500 never affordable
    assert_balance_matches_history(account_id)


def test_second_debit_waits_for_row_lock_then_sees_new_balance():
    """Deterministically force the race the assignment describes.

    Session A debits $80 but has NOT committed yet, so it holds the account
    row lock. Request B ($50) starts and must block on that lock. We confirm B
    is actually waiting on a lock (via pg_stat_activity), then commit A. B then
    proceeds against the new $20 balance: `balance_cents >= 5000` fails and it
    declines, recording the exact $20 balance.
    """
    account_id = make_funded_account(10_000)
    session_a = SessionLocal()
    try:
        assert _debit_if_sufficient_funds(session_a, account_id, 8_000) == 2_000  # uncommitted

        with ThreadPoolExecutor(max_workers=1) as pool:
            future_b = pool.submit(purchase_in_new_session(account_id, 5_000))

            # Wait (bounded) until B is observed blocked on a lock.
            deadline = time.monotonic() + 10
            blocked = False
            with SessionLocal() as observer:
                while time.monotonic() < deadline and not blocked:
                    blocked = observer.scalar(
                        text(
                            "SELECT count(*) > 0 FROM pg_stat_activity "
                            "WHERE datname = current_database() AND wait_event_type = 'Lock'"
                        )
                    )
                    observer.rollback()  # fresh snapshot of pg_stat_activity next loop
            assert blocked, "request B never waited on the account row lock"
            assert not future_b.done()

            session_a.commit()  # release the lock; balance is now $20
            status, reason, _ = future_b.result(timeout=10)
    finally:
        session_a.close()

    assert (status, reason) == ("declined", "insufficient_funds")
    assert stored_balance(account_id) == 2_000


def test_concurrent_card_issuance_creates_exactly_one_card():
    with SessionLocal() as db:
        account = account_service.create_account(db, "Card Racer", "cards@example.com")

    def issue_task():
        with SessionLocal() as db:
            card, created = card_service.issue_card(db, account.id)
            return card.id, created

    results = run_concurrently([issue_task for _ in range(10)])

    assert len({card_id for card_id, _ in results}) == 1
    assert [created for _, created in results].count(True) == 1
    with SessionLocal() as db:
        assert len(db.scalars(select(Card).where(Card.account_id == account.id)).all()) == 1


def test_concurrent_duplicate_signups_create_one_account():
    def signup_task():
        with SessionLocal() as db:
            try:
                account_service.create_account(db, "Dupe", "dupe@example.com")
                return "created"
            except ConflictError:
                return "conflict"

    results = run_concurrently([signup_task for _ in range(8)])
    assert results.count("created") == 1
    assert results.count("conflict") == 7


# ------------------------------------------------------- full HTTP stack


@pytest.fixture
def live_server():
    """Run the real app in uvicorn on a free port, so requests go over HTTP
    through FastAPI's thread pool exactly as they do in the running app."""
    config = uvicorn.Config(app, host="127.0.0.1", port=0, log_level="warning")
    server = uvicorn.Server(config)
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    deadline = time.monotonic() + 10
    while not server.started and time.monotonic() < deadline:
        time.sleep(0.01)
    assert server.started, "uvicorn did not start"
    port = server.servers[0].sockets[0].getsockname()[1]
    yield f"http://127.0.0.1:{port}"
    server.should_exit = True
    thread.join(timeout=10)


def test_http_concurrent_80_and_50_against_100(live_server):
    with httpx.Client(base_url=live_server) as http:
        account = http.post(
            "/api/accounts", json={"full_name": "Http Race", "email": "http@example.com"}
        ).json()
        http.post(f"/api/accounts/{account['id']}/deposits", json={"amount_cents": 10_000})
        http.post(f"/api/accounts/{account['id']}/cards")

    def http_purchase(amount_cents):
        def task():
            # A separate client = a separate HTTP connection per request.
            with httpx.Client(base_url=live_server) as http:
                response = http.post(
                    f"/api/accounts/{account['id']}/purchases",
                    json={
                        "merchant_name": "Pharmacy",
                        "merchant_category": "pharmacy",
                        "amount_cents": amount_cents,
                    },
                )
                assert response.status_code == 201
                return response.json()["transaction"]["status"]

        return task

    for _ in range(5):
        with httpx.Client(base_url=live_server) as http:
            current = http.get(f"/api/accounts/{account['id']}").json()["balance_cents"]
            # Top the account back up to exactly $100 for each round.
            if current < 10_000:
                http.post(f"/api/accounts/{account['id']}/deposits", json={"amount_cents": 10_000 - current})

        statuses = run_concurrently([http_purchase(8_000), http_purchase(5_000)])
        assert sorted(statuses) == ["approved", "declined"]

        with httpx.Client(base_url=live_server) as http:
            assert http.get(f"/api/accounts/{account['id']}").json()["balance_cents"] in (2_000, 5_000)

    assert_balance_matches_history(account["id"])
