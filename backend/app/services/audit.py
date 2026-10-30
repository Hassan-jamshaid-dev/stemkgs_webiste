"""Write-only audit trail (not exposed on public routes)."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.models.event import CalendarEvent
from app.models.user import User


def event_snapshot(ev: CalendarEvent) -> dict[str, Any]:
    return {
        "id": ev.id,
        "society": ev.society,
        "event_name": ev.event_name,
        "starts_at": ev.starts_at.isoformat() if ev.starts_at else None,
        "ends_at": ev.ends_at.isoformat() if ev.ends_at else None,
        "room": ev.room,
        "room_normalized": ev.room_normalized,
        "school_year": ev.school_year,
    }


def record_event_audit(
    db: Session,
    *,
    user: User,
    action: str,
    entity_id: str | None,
    before: dict[str, Any] | None,
    after: dict[str, Any] | None,
    detail: str | None = None,
) -> None:
    row = AuditLog(
        actor_user_id=user.id,
        actor_email=user.email,
        actor_society=user.society,
        action=action,
        entity_type="calendar_event",
        entity_id=entity_id,
        before_state=before,
        after_state=after,
        detail=detail,
    )
    db.add(row)
