import pytest

from tests.conftest import (
    balance,
    create_account,
    deposit,
    funded_account_with_card,
    purchase,
)

# ------------------------------------------------------------------ cards


def test_card_is_issued_once_and_reissue_returns_same_card(client):
    account = create_account(client)
    no_card = client.get(f"/api/accounts/{account['id']}/cards")
    assert no_card.status_code == 200 and no_card.json() is None

    first = client.post(f"/api/accounts/{account['id']}/cards")
    second = client.post(f"/api/accounts/{account['id']}/cards")

    assert first.status_code == 201
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]
    assert first.json()["status"] == "active"
    assert len(first.json()["last_four"]) == 4 and first.json()["last_four"].isdigit()
    assert client.get(f"/api/accounts/{account['id']}/cards").json()["id"] == first.json()["id"]


def test_freeze_and_unfreeze_card(client):
    account_id = funded_account_with_card(client, 10_000)

    frozen = client.patch(f"/api/accounts/{account_id}/cards", json={"status": "frozen"})
    assert frozen.status_code == 200 and frozen.json()["status"] == "frozen"

    declined = purchase(client, account_id, 1_000).json()
    assert declined["transaction"]["decline_reason"] == "card_frozen"
    assert balance(client, account_id) == 10_000

    client.patch(f"/api/accounts/{account_id}/cards", json={"status": "active"})
    assert purchase(client, account_id, 1_000).json()["transaction"]["status"] == "approved"
    assert balance(client, account_id) == 9_000


def test_freezing_without_a_card_is_404(client):
    account = create_account(client)
    response = client.patch(f"/api/accounts/{account['id']}/cards", json={"status": "frozen"})
    assert response.status_code == 404


def test_invalid_card_status_is_422(client):
    account_id = funded_account_with_card(client, 0)
    response = client.patch(f"/api/accounts/{account_id}/cards", json={"status": "stolen"})
    assert response.status_code == 422


# -------------------------------------------------------------- purchases


def test_purchase_before_card_is_declined_and_recorded(client):
    account = create_account(client)
    deposit(client, account["id"], 10_000)

    response = purchase(client, account["id"], 5_000)
    assert response.status_code == 201
    result = response.json()
    assert result["transaction"]["status"] == "declined"
    assert result["transaction"]["decline_reason"] == "card_required"
    assert result["transaction"]["card_id"] is None
    assert result["balance_cents"] == 10_000
    assert balance(client, account["id"]) == 10_000


def test_pharmacy_50_is_approved_and_debited(client):
    account_id = funded_account_with_card(client, 50_000)
    result = purchase(client, account_id, 5_000, "pharmacy", "Main St Pharmacy").json()

    assert result["transaction"]["status"] == "approved"
    assert result["transaction"]["decline_reason"] is None
    assert result["transaction"]["card_id"] is not None
    assert result["balance_cents"] == 45_000
    assert result["transaction"]["balance_after_cents"] == 45_000
    assert balance(client, account_id) == 45_000


@pytest.mark.parametrize("category", ["pharmacy", "hospital", "clinic", "dental", "vision"])
def test_qualified_categories_are_approved(client, category):
    account_id = funded_account_with_card(client, 20_000)
    result = purchase(client, account_id, 12_000, category).json()
    assert result["transaction"]["status"] == "approved"
    assert balance(client, account_id) == 8_000


@pytest.mark.parametrize("category", ["restaurant", "electronics", "grocery", "clothing"])
def test_non_qualified_categories_are_declined_without_debit(client, category):
    account_id = funded_account_with_card(client, 20_000)
    result = purchase(client, account_id, 1_000, category, "Somewhere").json()
    assert result["transaction"]["status"] == "declined"
    assert result["transaction"]["decline_reason"] == "ineligible_expense"
    assert "not a qualified medical expense" in result["message"]
    assert result["balance_cents"] == 20_000
    assert balance(client, account_id) == 20_000


def test_ineligible_is_reported_even_when_funds_are_short(client):
    # Eligibility is checked before funds, so the reason shown is the useful one.
    account_id = funded_account_with_card(client, 100)
    result = purchase(client, account_id, 5_000, "electronics").json()
    assert result["transaction"]["decline_reason"] == "ineligible_expense"


def test_overspend_is_declined_and_balance_never_negative(client):
    account_id = funded_account_with_card(client, 10_000)
    result = purchase(client, account_id, 10_001).json()
    assert result["transaction"]["status"] == "declined"
    assert result["transaction"]["decline_reason"] == "insufficient_funds"
    assert result["balance_cents"] == 10_000
    assert balance(client, account_id) == 10_000


def test_purchase_of_exact_balance_leaves_zero(client):
    account_id = funded_account_with_card(client, 10_000)
    assert purchase(client, account_id, 10_000).json()["transaction"]["status"] == "approved"
    assert balance(client, account_id) == 0
    assert purchase(client, account_id, 1).json()["transaction"]["decline_reason"] == "insufficient_funds"
    assert balance(client, account_id) == 0


@pytest.mark.parametrize(
    "payload",
    [
        {"merchant_name": "CVS", "merchant_category": "pharmacy", "amount_cents": 0},
        {"merchant_name": "CVS", "merchant_category": "pharmacy", "amount_cents": -100},
        {"merchant_name": "CVS", "merchant_category": "pharmacy", "amount_cents": 10.5},
        {"merchant_name": "CVS", "merchant_category": "pharmacy", "amount_cents": "100"},
        {"merchant_name": "CVS", "merchant_category": "pharmacy", "amount_cents": 1_000_001},
        {"merchant_name": "   ", "merchant_category": "pharmacy", "amount_cents": 100},
        {"merchant_name": "x" * 81, "merchant_category": "pharmacy", "amount_cents": 100},
        {"merchant_name": "CVS", "merchant_category": "casino", "amount_cents": 100},
        {"merchant_name": "CVS", "merchant_category": "PHARMACY", "amount_cents": 100},
        {"merchant_name": "CVS", "amount_cents": 100},
        {"merchant_category": "pharmacy", "amount_cents": 100},
        {"merchant_name": "CVS", "merchant_category": "pharmacy"},
        {"merchant_name": "C\u0000VS", "merchant_category": "pharmacy", "amount_cents": 100},
        {"merchant_name": "CVS", "merchant_category": "pharmacy", "amount_cents": 100, "status": "approved"},
    ],
)
def test_malformed_purchases_are_422_and_not_recorded(client, payload):
    account_id = funded_account_with_card(client, 10_000)
    response = client.post(f"/api/accounts/{account_id}/purchases", json=payload)
    assert response.status_code == 422
    assert balance(client, account_id) == 10_000
    history = client.get(f"/api/accounts/{account_id}/transactions?type=purchase").json()["items"]
    assert history == []


# ---------------------------------------------------------------- history


def test_history_is_newest_first_and_filterable(client):
    account_id = funded_account_with_card(client, 10_000)
    purchase(client, account_id, 1_000, "pharmacy", "First")
    purchase(client, account_id, 1_000, "restaurant", "Second")
    purchase(client, account_id, 2_000, "hospital", "Third")

    history = client.get(f"/api/accounts/{account_id}/transactions").json()["items"]
    assert [row["merchant_name"] for row in history] == ["Third", "Second", "First", None]

    declined = client.get(f"/api/accounts/{account_id}/transactions?status=declined").json()["items"]
    assert [row["merchant_name"] for row in declined] == ["Second"]

    deposits = client.get(f"/api/accounts/{account_id}/transactions?type=deposit").json()["items"]
    assert len(deposits) == 1 and deposits[0]["type"] == "deposit"

    limited = client.get(f"/api/accounts/{account_id}/transactions?limit=2").json()["items"]
    assert len(limited) == 2

    assert client.get(f"/api/accounts/{account_id}/transactions?status=maybe").status_code == 422


def test_account_summary_is_derived_from_history(client):
    account_id = funded_account_with_card(client, 30_000)
    deposit(client, account_id, 5_000)
    purchase(client, account_id, 4_000, "pharmacy")
    purchase(client, account_id, 6_000, "hospital")
    purchase(client, account_id, 1_000, "pharmacy")
    purchase(client, account_id, 2_500, "restaurant")
    purchase(client, account_id, 999_999, "hospital")

    detail = client.get(f"/api/accounts/{account_id}").json()
    summary = detail["summary"]
    assert detail["balance_cents"] == 35_000 - 11_000
    assert summary["total_deposited_cents"] == 35_000
    assert summary["total_spent_cents"] == 11_000
    assert summary["approved_purchase_count"] == 3
    assert summary["declined_purchase_count"] == 2
    assert summary["transaction_count"] == 7
    assert summary["spending_by_category"] == [
        {"category": "hospital", "approved_cents": 6_000, "approved_count": 1},
        {"category": "pharmacy", "approved_cents": 5_000, "approved_count": 2},
    ]
    # The balance always equals deposits minus approved purchases.
    assert detail["balance_cents"] == summary["total_deposited_cents"] - summary["total_spent_cents"]


def test_merchant_categories_endpoint_matches_rules(client):
    categories = {row["value"]: row["eligible"] for row in client.get("/api/merchant-categories").json()}
    assert categories["pharmacy"] is True
    assert categories["hospital"] is True
    assert categories["restaurant"] is False
    assert categories["electronics"] is False


def test_lab_accounts_are_isolated_from_the_account_list(client):
    create_account(client, email="real@example.com")
    response = client.post("/api/lab/accounts", json={"starting_balance_cents": 10_000})
    assert response.status_code == 201
    lab = response.json()
    assert lab["account"]["balance_cents"] == 10_000
    assert lab["card"]["status"] == "active"

    listed = [account["email"] for account in client.get("/api/accounts").json()]
    assert listed == ["real@example.com"]
    # ...but it is a real account that the normal endpoints can read.
    assert balance(client, lab["account"]["id"]) == 10_000
