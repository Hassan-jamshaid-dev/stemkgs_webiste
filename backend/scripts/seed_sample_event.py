"""Insert one sample public event for local UI verification (idempotent by name+room+start)."""

from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.db import SessionLocal
from app.models.event import CalendarEvent
from app.services.events import normalize_room

TZ = ZoneInfo("Asia/Karachi")
NAME = "Maths logistics sync"
START = datetime(2026, 8, 12, 15, 0, tzinfo=TZ)
END = datetime(2026, 8, 12, 16, 0, tzinfo=TZ)
ROOM = "Lab 2"
YEAR = "2026-2027"
SOCIETY = "maths"


def main() -> None:
    room_n = normalize_room(ROOM)
    with SessionLocal() as db:
        existing = db.scalar(
            select(CalendarEvent).where(
                CalendarEvent.event_name == NAME,
                CalendarEvent.starts_at == START,
                CalendarEvent.room_normalized == room_n,
            )
        )
        if existing:
            print("sample_event_exists", existing.id)
            return
        ev = CalendarEvent(
            society=SOCIETY,
            event_name=NAME,
            starts_at=START,
            ends_at=END,
            room=ROOM,
            room_normalized=room_n,
            school_year=YEAR,
        )
        db.add(ev)
        db.commit()
        db.refresh(ev)
        print("sample_event_created", ev.id)


if __name__ == "__main__":
    main()
