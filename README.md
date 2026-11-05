# Aster HSA — Health Savings Account Simulator

Aster is a locally runnable simulator for a health savings account (HSA). You can:

1. **Create an HSA account.** It starts at $0.00.
2. **Deposit funds.** These are simulated contributions.
3. **Issue a virtual debit card.** Each account can have one.
4. **Simulate card purchases.** Each purchase is approved or declined based on whether the merchant category is a qualified medical expense and whether the balance covers it.

It also handles **concurrent purchases** correctly. With a $100 balance, simultaneous $80 and $50 charges never both succeed, and the balance can never go negative. PostgreSQL enforces this, and the guarantee is proven by automated tests that run against a real database. You can also watch it happen in the **Concurrency Lab** page.

> **Demo only.** Nothing here moves real money, issues real cards or gives tax advice. Card "numbers" are four random display digits. Eligibility uses a simplified rule based on merchant category (see [Eligibility rule](#eligibility-rule)), not real IRS rules.

| Overview | Card & purchase simulator |
|---|---|
| ![Overview dashboard](docs/screenshots/overview.png) | ![Card and purchase simulator showing a declined restaurant purchase](docs/screenshots/card-declined.png) |
| **Activity** | **Concurrency Lab** |
| ![Transaction history](docs/screenshots/activity.png) | ![Concurrency Lab: $80 and $50 against $100](docs/screenshots/lab.png) |

**Demo video:** https://www.youtube.com/watch?v=jj5bIWksaeY 
NOTE: Sometimes video autoloads at low quality it can be changed in the video settings

---

## Quick start (Docker — recommended)

Requirements: Docker Desktop (or Docker Engine with the Compose plugin).

```bash
git clone https://github.com/DanielBautista7799/aster-hsa.git
```

```bash
cd aster-hsa
```

```bash
docker compose up --build
```

When the three services are running, open:

| What | URL |
|---|---|
| **Web app** | http://localhost:3000 |
| Interactive API docs (Swagger) | http://localhost:8000/api/docs (also proxied at http://localhost:3000/api/docs) |
| PostgreSQL (for tools like `psql`) | `localhost:5433`, user `aster`, password `aster_local_dev`, db `aster` |

On startup, the backend applies the database migration. Because `DEMO_MODE=true` by default, it also seeds three fictional accounts (Jordan Rivera, Priya Shah and Marcus Chen) so the app looks realistic immediately. Seeding is idempotent: an account that already exists is skipped and never modified. To start empty, run `DEMO_MODE=false docker compose up --build` on a fresh volume.

**Data persists** in the named Docker volume `aster_pgdata`. Both `docker compose down` and restarts keep it.

To **reset everything**, run the command below. ⚠️ It deletes all accounts and history.

```bash
docker compose down -v
```

Ports can be changed with a `.env` file (copy `.env.example`) if 3000, 8000 or 5433 are taken.

## Running the tests

The backend tests use a **separate database, `aster_test`**, which Compose creates automatically. They refuse to run against any database whose name doesn't end in `_test`, so they can never touch your demo data.

With the stack running:

```bash
docker compose exec backend pytest
```

Expected output: `126 passed`. This includes the concurrency tests:

- **$80 + $50 against $100.** Repeated 15 times. Exactly one is approved and the final balance is $20 or $50.
- **Twenty concurrent $10 purchases against $100.** Exactly ten are approved and the final balance is $0.
- **A mix of eligible and ineligible purchases, plus concurrent deposits.** These also cover deposits running alongside purchases.
- **A history-chain check after every race.** Each row's `balance_after` must equal the previous row's plus or minus its amount.
- **A deterministic lock test.** It shows the second debit actually *waits* on PostgreSQL's row lock, then declines.
- **A full-stack HTTP race.** It runs against a live uvicorn server.
- **Concurrent card issuance and duplicate sign-ups.** Exactly one of each succeeds.

The suite also covers cursor pagination of history: every page is walked, rows inserted mid-walk don't cause duplicates or gaps, identical timestamps page correctly, and search and filters combine with the cursor.

Backend lint and formatting use [ruff](https://docs.astral.sh/ruff/) (installed with the requirements). From `backend/`:

```bash
ruff check . && ruff format --check .
```

Frontend checks (no Docker needed; Node 22.22+ or 24.15+, which the test tooling requires). Run them from the `frontend` folder:

```bash
cd frontend
```

```bash
npm ci
```

```bash
npm test
```

```bash
npm run lint
```

```bash
npm run build
```

`npm test` runs 51 tests (money parsing and formatting, API error handling, page merging, and an Activity page component test that exercises Load more, search and filters against a fake API), `npm run lint` runs ESLint, and `npm run build` type-checks and builds the production bundle.

## Running without Docker (local development)

Requirements: Python 3.12+, Node 22.22+ (or 24.15+), and PostgreSQL 16. You can use the Compose `db` service on port 5433, or a local install.

**1. Database.** The simplest option is to use only the Compose database:

```bash
docker compose up -d db
```

With a local PostgreSQL instead, create a role `aster` (password `aster_local_dev`) that owns two databases, `aster` and `aster_test`.

**2. Backend.** The commands below assume the Compose database on port 5433. With a local PostgreSQL on 5432, change the port in both URLs.

```bash
cd backend
```

```bash
python -m venv .venv && source .venv/bin/activate
```

On Windows, activate with `.venv\Scripts\activate` instead.

```bash
pip install -r requirements.txt
```

```bash
export DATABASE_URL=postgresql+psycopg://aster:aster_local_dev@localhost:5433/aster
```

```bash
export TEST_DATABASE_URL=postgresql+psycopg://aster:aster_local_dev@localhost:5433/aster_test
```

```bash
alembic upgrade head
```

```bash
python -m app.seed
```

```bash
uvicorn app.main:app --reload --port 8000
```

`python -m app.seed` is optional: it adds the fictional demo accounts. `uvicorn` keeps running in this terminal.

To run the backend tests, open another terminal in `backend/`, activate the venv, export the same two variables, then run:

```bash
pytest
```

**3. Frontend** (in a second terminal):

```bash
cd frontend
```

```bash
npm ci
```

```bash
npm run dev
```

Then open http://localhost:5173. The Vite dev server forwards `/api/*` to `http://localhost:8000`, so there is no CORS setup.

## Architecture at a glance

```
Browser (React + MUI) ──/api──▶ nginx (Docker) or Vite (dev) ──▶ FastAPI (sync routes, thread pool)
                                                                    │ services: one DB transaction per request
                                                                    ▼
                                                              PostgreSQL 16
                                              accounts · cards · transactions (+ CHECK / UNIQUE / FK)
```

- **Money is integer cents everywhere.** This covers the database (`BIGINT`), the API (`amount_cents`) and the UI, which parses typed dollars into cents with string arithmetic. No floats ever touch money.
- **Purchases debit with one conditional `UPDATE … WHERE balance_cents >= :amount RETURNING`** inside the same database transaction that records the history row. The account row is locked first, so requests for one account take turns, and a `CHECK (balance_cents >= 0)` constraint is the backstop.
- **Every well-formed purchase attempt is recorded,** approved or declined with a reason (`ineligible_expense`, `insufficient_funds`, `card_required`, `card_frozen`). Malformed input returns 422 and records nothing.

See **[architecture.md](architecture.md)** for the request flow, data model, concurrency reasoning and tradeoffs. **[ai-usage.md](ai-usage.md)** describes how AI tools were used and how the output was verified.

## API

All amounts are integer cents. Full schemas are in Swagger at `/api/docs`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | API + database health |
| GET | `/api/accounts` | List accounts (excludes Concurrency Lab sandboxes) |
| POST | `/api/accounts` | Create account `{full_name, email}` → 201, 409 on duplicate email |
| GET | `/api/accounts/{id}` | Account, balance and history-derived summary |
| POST | `/api/accounts/{id}/deposits` | Deposit `{amount_cents}` → 201 with the new balance |
| GET | `/api/accounts/{id}/cards` | The account's card, or `null` if none issued |
| POST | `/api/accounts/{id}/cards` | Issue the card → 201, or 200 with the existing card (idempotent) |
| PATCH | `/api/accounts/{id}/cards` | Freeze or unfreeze `{status: "active" \| "frozen"}` |
| POST | `/api/accounts/{id}/purchases` | Purchase `{merchant_name, merchant_category, amount_cents}` → 201 with `transaction.status` approved or declined |
| GET | `/api/accounts/{id}/transactions` | One page of history, newest first: `{items, next_cursor, total_count}`. Optional `?type=`, `?status=`, `?q=` (search), `?limit=` (default 50, max 200) and `?cursor=` (the previous page's `next_cursor`) |
| GET | `/api/merchant-categories` | Categories and their simulated eligibility |
| POST | `/api/lab/accounts` | Concurrency Lab: create an isolated, funded sandbox account with a card |

A declined purchase is a normal business outcome, not an HTTP error. The response is still `201`, and the transaction row explains why it was declined.

History is paged with a cursor: repeat the same filters and pass back `next_cursor` until it is `null`. New transactions that arrive while you page never cause duplicates or gaps (see [architecture.md](architecture.md#transaction-history-get-apiaccountsidtransactions)).

Example:

```bash
curl -s -X POST localhost:8000/api/accounts -H 'content-type: application/json' -d '{"full_name":"Sam Lee","email":"sam@example.com"}'
```

## Eligibility rule

| Qualified in this simulation | Not qualified |
|---|---|
| pharmacy, hospital, clinic, dental, vision | restaurant, electronics, grocery, clothing |

Pharmacy, hospital, restaurant and electronics come directly from the assignment. The other five are illustrative. The rule is a lookup table in [`backend/app/services/eligibility.py`](backend/app/services/eligibility.py). Unknown categories are rejected with a 422, so a category is never approved by accident. **Real HSA eligibility depends on what is purchased, not where.** This is a demonstration proxy, not tax advice.

## Project layout

```
backend/
  app/
    main.py              FastAPI app, routers, error mapping
    database.py          engine + session factory (sync SQLAlchemy 2)
    models/              Account, Card, Transaction (constraints live here)
    schemas/             Pydantic request/response models (strict integer cents)
    routes/              thin HTTP layer
    services/            business logic: accounts/deposits, cards, purchases, eligibility, history, lab
    seed.py              idempotent demo data (python -m app.seed)
  alembic/versions/      0001_initial_schema.py
  tests/                 126 pytest tests against real PostgreSQL (incl. concurrency + pagination)
frontend/
  src/
    api/                 typed fetch helpers (one API base: /api)
    state/               AccountContext (selected account + server data), card actions
    pages/               Overview, Activity, Card & purchases, Account, Concurrency Lab
    components/          card visual, dialogs, get-started checklist, simulator, receipt, tables, shell
    lib/                 money parsing/formatting (+ tests), date/label helpers
    theme/               Aster design tokens + MUI theme
compose.yaml             db + backend + frontend
docs/                    demo script, build notes, screenshots
```

## Troubleshooting

- **Port already in use.** Copy `.env.example` to `.env` and change `WEB_PORT`, `API_PORT` or `DB_PORT`.
- **The web app says it can't reach the API.** Check `docker compose ps`; all services should be `running`. View the logs with `docker compose logs backend`.
- **Changed the Postgres user or password after the first run.** The volume keeps the original credentials. Reset with `docker compose down -v` (this deletes data).
- **Tests say "Refusing to run tests".** `TEST_DATABASE_URL` must point at a database whose name ends in `_test`. This is intentional.
- **The `aster_test` database is missing** (for example, the volume was created by an older version). Create it with:

  ```bash
  docker compose exec db createdb -U aster aster_test
  ```

## What is simulated vs. what production would need

This is a demo with no authentication, a single currency, and no real payment rails. A production system would add the following. These are **not built** here:

- authentication and authorization
- idempotency keys on money-moving requests
- a double-entry ledger with holds and settlement
- annual IRS contribution limits
- real eligibility (item-level / IIAS)
- PCI-scoped card issuing through a processor
- audit logging, monitoring and rate limiting

See the tradeoffs section of [architecture.md](architecture.md).
