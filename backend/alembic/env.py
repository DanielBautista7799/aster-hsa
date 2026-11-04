"""Alembic migration environment.

The database URL comes from app.config (DATABASE_URL env var), so migrations,
the API and the tests all agree on which database they talk to.
"""

from logging.config import fileConfig

from sqlalchemy import create_engine

import app.models  # noqa: F401  (registers all tables on Base.metadata)
from alembic import context
from app.config import DATABASE_URL
from app.database import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(url=DATABASE_URL, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
