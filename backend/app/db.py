"""SQLAlchemy engine and session helpers."""

import os
from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.config import get_settings

settings = get_settings()

# Serverless (Vercel) must not hold pooled connections across invocations.
_engine_kwargs: dict = {"pool_pre_ping": True}
if os.environ.get("VERCEL") or settings.is_production:
    _engine_kwargs["poolclass"] = NullPool
else:
    _engine_kwargs["pool_size"] = 5
    _engine_kwargs["max_overflow"] = 10

engine = create_engine(settings.database_url, **_engine_kwargs)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, class_=Session)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database() -> bool:
    """Return True when the database accepts a simple query."""
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return True
