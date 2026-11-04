#!/bin/sh
# Container start-up: apply migrations, optionally seed demo data, start the API.
set -e

echo "Applying database migrations..."
alembic upgrade head

if [ "${DEMO_MODE:-false}" = "true" ]; then
  # Idempotent: accounts that already exist are skipped, nothing is modified.
  # A seeding problem must never stop the API from starting.
  echo "DEMO_MODE=true: seeding fictional demo accounts (skipped if present)..."
  python -m app.seed || echo "Demo seed failed; continuing without it."
fi

exec "$@"
