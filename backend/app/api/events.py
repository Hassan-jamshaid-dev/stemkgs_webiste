"""Public + editor calendar event routes."""

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import require_csrf
from app.config import get_settings
from app.db import get_db
from app.models.session import AuthSession
from app.models.user import User
from app.schemas.events import EditorEvent, EventCreate, EventUpdate, PublicEvent, PublicEventList
from app.services.events import create_event, delete_event, list_public_events, update_event

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=PublicEventList)
def get_public_events(
    school_year: str = Query(default="2025-2026", min_length=9, max_length=9),
    month: int | None = Query(
        default=None,
        ge=0,
        le=11,
        description="Optional calendar month index (0=Jan … 11=Dec).",
    ),
    db: Session = Depends(get_db),
) -> PublicEventList:
    if len(school_year) != 9 or school_year[4] != "-":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid school_year.")
    events = list_public_events(db, school_year=school_year, month_index=month)
    public = [PublicEvent.model_validate(ev) for ev in events]
    return PublicEventList(school_year=school_year, count=len(public), events=public)


@router.post("", response_model=EditorEvent, status_code=status.HTTP_201_CREATED)
def post_event(
    body: EventCreate,
    db: Session = Depends(get_db),
    auth: tuple[AuthSession, User] = Depends(require_csrf),
) -> EditorEvent:
    _session, user = auth
    school_year = body.school_year or get_settings().school_year_current
    ev = create_event(
        db,
        user=user,
        event_name=body.event_name,
        starts_at=body.starts_at,
        ends_at=body.ends_at,
        room=body.room,
        school_year=school_year,
    )
    return EditorEvent.model_validate(ev)


@router.put("/{event_id}", response_model=EditorEvent)
def put_event(
    event_id: str,
    body: EventUpdate,
    db: Session = Depends(get_db),
    auth: tuple[AuthSession, User] = Depends(require_csrf),
) -> EditorEvent:
    _session, user = auth
    ev = update_event(
        db,
        user=user,
        event_id=event_id,
        event_name=body.event_name,
        starts_at=body.starts_at,
        ends_at=body.ends_at,
        room=body.room,
    )
    return EditorEvent.model_validate(ev)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_event(
    event_id: str,
    db: Session = Depends(get_db),
    auth: tuple[AuthSession, User] = Depends(require_csrf),
) -> Response:
    _session, user = auth
    delete_event(db, user=user, event_id=event_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
