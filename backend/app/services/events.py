"""Calendar event queries and helpers."""

from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import Select, and_, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.event import CalendarEvent


def school_year_bounds(school_year: str) -> tuple[datetime, datetime]:
    """Aug 1 start-year 00:00 → Jul 31 end-year 23:59:59 Asia/Karachi."""
    start_y, end_y = school_year.split("-")
    tz = ZoneInfo(get_settings().tz)
    start = datetime(int(start_y), 8, 1, 0, 0, 0, tzinfo=tz)
    end = datetime(int(end_y), 7, 31, 23, 59, 59, tzinfo=tz)
    return start, end


def month_window(school_year: str, month_index: int) -> tuple[datetime, datetime]:
    """month_index: 0=Jan … 11=Dec within the school year Aug→Jul."""
    start_y, end_y = (int(p) for p in school_year.split("-"))
    year = start_y if month_index >= 7 else end_y
    tz = ZoneInfo(get_settings().tz)
    start = datetime(year, month_index + 1, 1, 0, 0, 0, tzinfo=tz)
    if month_index == 11:
        end = datetime(year + 1, 1, 1, 0, 0, 0, tzinfo=tz)
    else:
        end = datetime(year, month_index + 2, 1, 0, 0, 0, tzinfo=tz)
    return start, end


def normalize_room(room: str) -> str:
    collapsed = " ".join(room.strip().lower().split())
    return collapsed


def list_public_events(
    db: Session,
    *,
    school_year: str,
    month_index: int | None = None,
) -> list[CalendarEvent]:
    stmt: Select[tuple[CalendarEvent]] = (
        select(CalendarEvent)
        .where(CalendarEvent.school_year == school_year)
        .order_by(CalendarEvent.starts_at.asc())
    )
    if month_index is not None:
        window_start, window_end = month_window(school_year, month_index)
        # Include multi-day events that overlap the month window.
        stmt = stmt.where(
            and_(
                CalendarEvent.starts_at < window_end,
                CalendarEvent.ends_at > window_start,
            )
        )
    return list(db.scalars(stmt).all())


def find_room_conflicts(
    db: Session,
    *,
    room_normalized: str,
    starts_at: datetime,
    ends_at: datetime,
    exclude_id: str | None = None,
    gap_hours: float = 2.0,
) -> list[CalendarEvent]:
    """
    Conflict if same normalized room and intervals overlap OR gap < gap_hours.
    Equivalent: other.start < this.end + gap AND other.end > this.start - gap.
    """
    from datetime import timedelta

    gap = timedelta(hours=gap_hours)
    expanded_start = starts_at - gap
    expanded_end = ends_at + gap
    stmt = select(CalendarEvent).where(
        CalendarEvent.room_normalized == room_normalized,
        CalendarEvent.starts_at < expanded_end,
        CalendarEvent.ends_at > expanded_start,
    )
    if exclude_id:
        stmt = stmt.where(CalendarEvent.id != exclude_id)
    return list(db.scalars(stmt).all())
