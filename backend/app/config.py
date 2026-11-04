"""Application settings, read once from environment variables.

Keeping every setting in one small module gives us a single obvious place to
look when something is misconfigured.
"""

import os

# Local-development default. Docker Compose overrides this via the environment.
DEFAULT_DATABASE_URL = "postgresql+psycopg://aster:aster_local_dev@localhost:5432/aster"

DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)

# Demo safety limits. Amounts are always integer cents.
MAX_DEPOSIT_CENTS = 1_000_000  # $10,000.00 per deposit
MAX_PURCHASE_CENTS = 1_000_000  # $10,000.00 per purchase

# The Concurrency Lab endpoint can be switched off (e.g. for a stricter demo).
ENABLE_CONCURRENCY_LAB = os.getenv("ENABLE_CONCURRENCY_LAB", "true").lower() == "true"
