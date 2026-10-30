"""Public calendar payload shape."""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient
from sqlalchemy import delete

from app.db import SessionLocal
from app.models.event import CalendarEvent
from app.services.events import normalize_room
from tests.conftest import TEST_PREFIX

TZ = ZoneInfo("Asia/Karachi")


def test_public_events_shape_only_allowed_fields(client: TestClient, maths_user) -> None:
    with SessionLocal() as db:
        ev = CalendarEvent(
            society="maths",
            event_name=f"{TEST_PREFIX}public-shape",
            starts_at=datetime(2026, 12, 1, 10, 0, tzinfo=TZ),
            ends_at=datetime(2026, 12, 1, 11, 0, tzinfo=TZ),
            room="Lab X",
            room_normalized=normalize_room("Lab X"),
            school_year="2026-2027",
            created_by_user_id=maths_user.id,
        )
        db.add(ev)
        db.commit()
        db.refresh(ev)
        eid = ev.id

    try:
        r = client.get("/events", params={"school_year": "2026-2027", "month": 11})
        assert r.status_code == 200
        payload = r.json()
        assert set(payload.keys()) == {"school_year", "count", "events"}
        match = next(e for e in payload["events"] if e["id"] == eid)
        assert set(match.keys()) == {
            "id",
            "society",
            "event_name",
            "starts_at",
            "ends_at",
            "room",
            "school_year",
        }
        assert "password" not in r.text.lower()
        assert "csrf" not in r.text.lower()
        assert "room_normalized" not in match
        assert "created_by_user_id" not in match
        assert "audit" not in r.text.lower()
    finally:
        with SessionLocal() as db:
            db.execute(delete(CalendarEvent).where(CalendarEvent.id == eid))
            db.commit()


def test_security_headers_present(client: TestClient) -> None:
    r = client.get("/health")
    assert r.headers.get("X-Content-Type-Options") == "nosniff"
    assert r.headers.get("X-Frame-Options") == "DENY"
