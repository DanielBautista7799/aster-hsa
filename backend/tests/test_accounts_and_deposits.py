import uuid

import pytest

from tests.conftest import balance, create_account, deposit


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


def test_new_account_starts_at_zero_and_is_normalised(client):
    response = client.post(
        "/api/accounts", json={"full_name": "  Jamie   Lee ", "email": "  Jamie.Lee@Example.COM "}
    )
    assert response.status_code == 201
    account = response.json()
    assert account["balance_cents"] == 0
    assert account["full_name"] == "Jamie Lee"
    assert account["email"] == "jamie.lee@example.com"
    assert balance(client, account["id"]) == 0


def test_duplicate_email_is_a_409_regardless_of_case(client):
    create_account(client, email="sam@example.com")
    response = client.post("/api/accounts", json={"full_name": "Sam Two", "email": "SAM@example.com"})
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


@pytest.mark.parametrize(
    "payload",
    [
        {"full_name": "   ", "email": "ok@example.com"},
        {"full_name": "", "email": "ok@example.com"},
        {"full_name": "Valid Name", "email": "not-an-email"},
        {"full_name": "Valid Name", "email": "two@@example.com"},
        {"full_name": "Valid Name"},
        {"email": "ok@example.com"},
        {"full_name": "x" * 121, "email": "ok@example.com"},
        {"full_name": "Nul\u0000Byte", "email": "ok@example.com"},
        {"full_name": "Valid Name", "email": "o\u0000k@example.com"},
        {"full_name": "Valid Name", "email": "ok@example.com", "balance_cents": 100_000},
    ],
)
def test_invalid_account_input_is_rejected(client, payload):
    response = client.post("/api/accounts", json=payload)
    assert response.status_code == 422
    assert client.get("/api/accounts").json() == []


def test_list_accounts_is_oldest_first(client):
    first = create_account(client, email="first@example.com")
    second = create_account(client, email="second@example.com")
    ids = [account["id"] for account in client.get("/api/accounts").json()]
    assert ids == [first["id"], second["id"]]


def test_deposit_500_updates_balance_and_history(client):
    account = create_account(client)
    result = deposit(client, account["id"], 50_000)

    assert result["balance_cents"] == 50_000
    assert result["message"] == "Deposited $500.00."
    assert result["transaction"]["type"] == "deposit"
    assert result["transaction"]["status"] == "approved"
    assert result["transaction"]["balance_after_cents"] == 50_000
    assert balance(client, account["id"]) == 50_000

    history = client.get(f"/api/accounts/{account['id']}/transactions").json()["items"]
    assert len(history) == 1
    assert history[0]["amount_cents"] == 50_000


def test_multiple_deposits_accumulate(client):
    account = create_account(client)
    deposit(client, account["id"], 1)
    deposit(client, account["id"], 12_345)
    assert balance(client, account["id"]) == 12_346


@pytest.mark.parametrize(
    "amount",
    [0, -1, -5000, 50.5, 5000.0, 12.345, "5000", "50.00", None, True, 1_000_001, "1e3"],
)
def test_invalid_deposit_amounts_are_rejected_without_side_effects(client, amount):
    account = create_account(client)
    response = client.post(f"/api/accounts/{account['id']}/deposits", json={"amount_cents": amount})
    assert response.status_code == 422
    assert balance(client, account["id"]) == 0
    assert client.get(f"/api/accounts/{account['id']}/transactions").json()["items"] == []


def test_deposit_maximum_is_accepted(client):
    account = create_account(client)
    deposit(client, account["id"], 1_000_000)
    assert balance(client, account["id"]) == 1_000_000


def test_unknown_account_returns_404_everywhere(client):
    missing = uuid.uuid4()
    assert client.get(f"/api/accounts/{missing}").status_code == 404
    assert client.post(f"/api/accounts/{missing}/deposits", json={"amount_cents": 100}).status_code == 404
    assert client.get(f"/api/accounts/{missing}/cards").status_code == 404
    assert client.post(f"/api/accounts/{missing}/cards").status_code == 404
    assert client.get(f"/api/accounts/{missing}/transactions").status_code == 404
    purchase = {"merchant_name": "X", "merchant_category": "pharmacy", "amount_cents": 100}
    assert client.post(f"/api/accounts/{missing}/purchases", json=purchase).status_code == 404


def test_malformed_account_id_is_422(client):
    assert client.get("/api/accounts/not-a-uuid").status_code == 422
