"""Shared pytest fixtures.

Tests run against a REAL PostgreSQL database (never SQLite, never mocks) so the
row locking and constraints we rely on are actually exercised.

Safety: tests only ever use TEST_DATABASE_URL, and refuse to run unless the
database name ends in "_test". Tables are emptied between tests, so this guard
is what guarantees the demo/development database is never touched.
"""

import os

from sqlalchemy.engine import make_url

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://aster:aster_local_dev@localhost:5432/aster_test",
)
if not make_url(TEST_DATABASE_URL).database.endswith("_test"):
    raise RuntimeError(
        f"Refusing to run tests: TEST_DATABASE_URL must point at a database whose "
        f"name ends in '_test' (got {make_url(TEST_DATABASE_URL).database!r})."
    )

# Must be set BEFORE importing anything from `app`, because app.config reads it
# at import time and app.database creates the engine from it.
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

import pytest  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from alembic import command  # noqa: E402
from app.database import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# Arbitrary constant identifying "a pytest session is using the test database".
TEST_SESSION_LOCK_ID = 727_001


@pytest.fixture(scope="session", autouse=True)
def migrated_database():
    """Build the schema with the real Alembic migration (so it is tested too).

    A session-level PostgreSQL advisory lock is held for the whole run, so two
    pytest processes pointed at the same test database queue up instead of
    truncating each other's tables mid-test.
    """
    with engine.connect() as lock_connection:
        lock_connection.execute(text("SELECT pg_advisory_lock(:id)"), {"id": TEST_SESSION_LOCK_ID})
        config = Config(os.path.join(BACKEND_DIR, "alembic.ini"))
        config.set_main_option("script_location", os.path.join(BACKEND_DIR, "alembic"))
        command.upgrade(config, "head")
        yield
        lock_connection.execute(text("SELECT pg_advisory_unlock(:id)"), {"id": TEST_SESSION_LOCK_ID})
    engine.dispose()


@pytest.fixture(autouse=True)
def clean_tables():
    """Start every test from empty tables in the dedicated test database."""
    with engine.begin() as connection:
        connection.execute(text("TRUNCATE transactions, cards, accounts"))
    yield


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


# ---------------------------------------------------------------- helpers


def create_account(client, email="alex@example.com", full_name="Alex Morgan") -> dict:
    response = client.post("/api/accounts", json={"full_name": full_name, "email": email})
    assert response.status_code == 201, response.text
    return response.json()


def deposit(client, account_id, amount_cents) -> dict:
    response = client.post(f"/api/accounts/{account_id}/deposits", json={"amount_cents": amount_cents})
    assert response.status_code == 201, response.text
    return response.json()


def issue_card(client, account_id) -> dict:
    response = client.post(f"/api/accounts/{account_id}/cards")
    assert response.status_code in (200, 201), response.text
    return response.json()


def purchase(client, account_id, amount_cents, category="pharmacy", merchant="Corner Pharmacy"):
    return client.post(
        f"/api/accounts/{account_id}/purchases",
        json={"merchant_name": merchant, "merchant_category": category, "amount_cents": amount_cents},
    )


def balance(client, account_id) -> int:
    response = client.get(f"/api/accounts/{account_id}")
    assert response.status_code == 200, response.text
    return response.json()["balance_cents"]


def funded_account_with_card(client, amount_cents, email="funded@example.com") -> str:
    account = create_account(client, email=email)
    if amount_cents:
        deposit(client, account["id"], amount_cents)
    issue_card(client, account["id"])
    return account["id"]
