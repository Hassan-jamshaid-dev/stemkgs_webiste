"""Calendar event queries and helpers."""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import Select, and_, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.event import CalendarEvent
from app.models.user import User
from app.services.school_year import assert_current_school_year, assert_range_in_school_year


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


def _raise_if_conflicts(conflicts: list[CalendarEvent]) -> None:
    if not conflicts:
        return
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            "message": "Room conflict: overlap or less than 2 hours between bookings.",
            "conflicts": [
                {
                    "id": c.id,
                    "society": c.society,
                    "event_name": c.event_name,
                    "starts_at": c.starts_at.isoformat(),
                    "ends_at": c.ends_at.isoformat(),
                    "room": c.room,
                }
                for c in conflicts
            ],
        },
    )


def create_event(
    db: Session,
    *,
    user: User,
    event_name: str,
    starts_at: datetime,
    ends_at: datetime,
    room: str,
    school_year: str,
) -> CalendarEvent:
    assert_current_school_year(school_year)
    assert_range_in_school_year(school_year, starts_at, ends_at)
    room_raw = room.strip()
    room_n = normalize_room(room_raw)
    if not room_n:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Room is required.")

    conflicts = find_room_conflicts(
        db,
        room_normalized=room_n,
        starts_at=starts_at,
        ends_at=ends_at,
    )
    _raise_if_conflicts(conflicts)

    ev = CalendarEvent(
        society=user.society,
        event_name=event_name.strip(),
        starts_at=starts_at,
        ends_at=ends_at,
        room=room_raw,
        room_normalized=room_n,
        school_year=school_year,
        created_by_user_id=user.id,
        updated_by_user_id=user.id,
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev


def update_event(
    db: Session,
    *,
    user: User,
    event_id: str,
    event_name: str | None,
    starts_at: datetime | None,
    ends_at: datetime | None,
    room: str | None,
) -> CalendarEvent:
    ev = db.get(CalendarEvent, event_id)
    if ev is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")
    if ev.society != user.society:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your society's events.",
        )
    assert_current_school_year(ev.school_year)

    new_name = event_name.strip() if event_name is not None else ev.event_name
    new_start = starts_at if starts_at is not None else ev.starts_at
    new_end = ends_at if ends_at is not None else ev.ends_at
    new_room = room.strip() if room is not None else ev.room
    new_room_n = normalize_room(new_room)
    if not new_room_n:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Room is required.")

    assert_range_in_school_year(ev.school_year, new_start, new_end)
    conflicts = find_room_conflicts(
        db,
        room_normalized=new_room_n,
        starts_at=new_start,
        ends_at=new_end,
        exclude_id=ev.id,
    )
    _raise_if_conflicts(conflicts)

    ev.event_name = new_name
    ev.starts_at = new_start
    ev.ends_at = new_end
    ev.room = new_room
    ev.room_normalized = new_room_n
    ev.updated_by_user_id = user.id
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev


def delete_event(db: Session, *, user: User, event_id: str) -> None:
    ev = db.get(CalendarEvent, event_id)
    if ev is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")
    if ev.society != user.society:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your society's events.",
        )
    assert_current_school_year(ev.school_year)
    db.delete(ev)
    db.commit()
