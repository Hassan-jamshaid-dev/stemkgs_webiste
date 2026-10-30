"""Event schemas — public vs editor shapes."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


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
    event_name: str = Field(min_length=1, max_length=200)
    starts_at: datetime
    ends_at: datetime
    room: str = Field(min_length=1, max_length=120)
    school_year: str = Field(default="2025-2026", min_length=9, max_length=9)


class EventUpdate(BaseModel):
    event_name: str | None = Field(default=None, min_length=1, max_length=200)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    room: str | None = Field(default=None, min_length=1, max_length=120)
