"""School-year helpers (Aug→Jul, current year gate)."""

from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status

from app.config import get_settings


def assert_current_school_year(school_year: str) -> None:
    current = get_settings().school_year_current
    if school_year != current:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Edits allowed only for the current school year ({current}).",
        )


def assert_range_in_school_year(school_year: str, starts_at: datetime, ends_at: datetime) -> None:
    if ends_at <= starts_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ends_at must be after starts_at.",
        )
    start_y, end_y = (int(p) for p in school_year.split("-"))
    tz = ZoneInfo(get_settings().tz)
    year_start = datetime(start_y, 8, 1, 0, 0, 0, tzinfo=tz)
    year_end = datetime(end_y, 8, 1, 0, 0, 0, tzinfo=tz)  # exclusive upper bound
    s = starts_at.astimezone(tz) if starts_at.tzinfo else starts_at.replace(tzinfo=tz)
    e = ends_at.astimezone(tz) if ends_at.tzinfo else ends_at.replace(tzinfo=tz)
    if s < year_start or e > year_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Event times must fall within school year {school_year} (Aug–Jul).",
        )
