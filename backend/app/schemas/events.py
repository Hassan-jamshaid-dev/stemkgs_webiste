"""Event schemas — public vs editor shapes."""

from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.config import get_settings


def _combine_karachi(d: date, t: time) -> datetime:
    tz = ZoneInfo(get_settings().tz)
    return datetime(d.year, d.month, d.day, t.hour, t.minute, t.second, t.microsecond, tzinfo=tz)


class PublicEvent(BaseModel):
    """Student / public calendar payload only."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    society: str
    event_name: str
    starts_at: datetime
    ends_at: datetime
    room: str
    school_year: str


class PublicEventList(BaseModel):
    school_year: str
    count: int
    events: list[PublicEvent]


class EventCreate(BaseModel):
    """
    Create booking with start date+time and end date+time.

    Prefer start_date/start_time + end_date/end_time (multi-day friendly).
    starts_at/ends_at remain accepted for API clients that already compose datetimes.
    """

    event_name: str = Field(min_length=1, max_length=200)
    room: str = Field(min_length=1, max_length=120)
    school_year: str = Field(default="2026-2027", min_length=9, max_length=9)

    start_date: date | None = None
    start_time: time | None = None
    end_date: date | None = None
    end_time: time | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None

    @model_validator(mode="after")
    def resolve_bounds(self) -> "EventCreate":
        start = self.starts_at
        end = self.ends_at
        if self.start_date is not None and self.start_time is not None:
            start = _combine_karachi(self.start_date, self.start_time)
        if self.end_date is not None and self.end_time is not None:
            end = _combine_karachi(self.end_date, self.end_time)

        if start is None or end is None:
            raise ValueError(
                "Provide start_date+start_time and end_date+end_time "
                "(or starts_at and ends_at)."
            )
        if end <= start:
            raise ValueError("Ending date/time must be after starting date/time.")

        self.starts_at = start
        self.ends_at = end
        return self


class EventUpdate(BaseModel):
    """
    Partial update. When changing times, send the full start and end bounds
    (date+time pairs or starts_at/ends_at).
    """

    event_name: str | None = Field(default=None, min_length=1, max_length=200)
    room: str | None = Field(default=None, min_length=1, max_length=120)

    start_date: date | None = None
    start_time: time | None = None
    end_date: date | None = None
    end_time: time | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None

    @model_validator(mode="after")
    def resolve_bounds(self) -> "EventUpdate":
        has_start_parts = self.start_date is not None or self.start_time is not None
        has_end_parts = self.end_date is not None or self.end_time is not None
        if has_start_parts and (self.start_date is None or self.start_time is None):
            raise ValueError("start_date and start_time must be provided together.")
        if has_end_parts and (self.end_date is None or self.end_time is None):
            raise ValueError("end_date and end_time must be provided together.")

        if self.start_date is not None and self.start_time is not None:
            self.starts_at = _combine_karachi(self.start_date, self.start_time)
        if self.end_date is not None and self.end_time is not None:
            self.ends_at = _combine_karachi(self.end_date, self.end_time)

        if self.starts_at is not None and self.ends_at is not None and self.ends_at <= self.starts_at:
            raise ValueError("Ending date/time must be after starting date/time.")
        return self


class EditorEvent(PublicEvent):
    room_normalized: str
    created_by_user_id: str | None = None
    updated_by_user_id: str | None = None


class ConflictDetail(BaseModel):
    id: str
    society: str
    event_name: str
    starts_at: datetime
    ends_at: datetime
    room: str
