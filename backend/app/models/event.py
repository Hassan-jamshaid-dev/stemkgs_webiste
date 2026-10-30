"""Calendar logistics events."""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class CalendarEvent(Base, TimestampMixin):
    __tablename__ = "calendar_events"
    __table_args__ = (
        Index("ix_calendar_events_school_year_start", "school_year", "starts_at"),
        Index("ix_calendar_events_room_norm_starts", "room_normalized", "starts_at"),
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    society: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    event_name: Mapped[str] = mapped_column(String(200), nullable=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    room: Mapped[str] = mapped_column(String(120), nullable=False)
    room_normalized: Mapped[str] = mapped_column(String(120), nullable=False)
    school_year: Mapped[str] = mapped_column(String(9), nullable=False, index=True)
    created_by_user_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    updated_by_user_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
