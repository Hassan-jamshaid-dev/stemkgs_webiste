"""Shared declarative base and timestamp helpers."""

from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import DateTime, MetaData, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.config import get_settings

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


def karachi_now() -> datetime:
    return datetime.now(ZoneInfo(get_settings().tz))


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


class TimestampMixin:
    """Asia/Karachi-aware created/updated columns on every table."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.timezone("Asia/Karachi", func.now()),
        default=karachi_now,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.timezone("Asia/Karachi", func.now()),
        onupdate=karachi_now,
        default=karachi_now,
    )
