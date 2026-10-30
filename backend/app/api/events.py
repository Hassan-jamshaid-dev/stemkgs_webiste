"""Public (and later editor) calendar event routes."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.events import PublicEvent, PublicEventList
from app.services.events import list_public_events

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
