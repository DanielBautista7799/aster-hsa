"""Database engine and session factory (synchronous SQLAlchemy 2.x)."""

from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import DATABASE_URL

# FastAPI runs our synchronous route functions in a thread pool, so several
# requests can hold a database connection at the same time. The pool is sized
# so a burst of simultaneous purchases (e.g. the 20-request concurrency test)
# gets real, separate connections instead of being serialised by the pool.
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

# expire_on_commit=False lets us keep reading attributes of an object after
# commit (e.g. to build the response) without a surprise extra query.
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    """Base class for all ORM models."""


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one session (one connection) per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
