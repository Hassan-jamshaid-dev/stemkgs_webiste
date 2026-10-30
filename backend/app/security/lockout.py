"""Login lockout ladder stored on the user row."""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.config import get_settings

# After each block of FAILED_ATTEMPTS_PER_STEP failures, apply the next duration.
FAILED_ATTEMPTS_PER_STEP = 3
LOCKOUT_DURATIONS = (
    timedelta(seconds=30),
    timedelta(minutes=1),
    timedelta(minutes=5),
    timedelta(minutes=30),
    timedelta(hours=1),
    timedelta(days=1),
)


def _now() -> datetime:
    return datetime.now(ZoneInfo(get_settings().tz))


def is_locked(locked_until: datetime | None, now: datetime | None = None) -> bool:
    if locked_until is None:
        return False
    current = now or _now()
    if locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=ZoneInfo(get_settings().tz))
    return locked_until > current


def register_failure(
    *,
    failed_login_count: int,
    lockout_level: int,
    now: datetime | None = None,
) -> tuple[int, int, datetime | None]:
    """
    Return (new_failed_count, new_lockout_level, locked_until).

    Ladder: every 3 failures → 30s → 1m → 5m → 30m → 1h → 1d (caps at last).
    """
    current = now or _now()
    new_count = failed_login_count + 1
    new_level = lockout_level
    locked_until: datetime | None = None

    if new_count >= FAILED_ATTEMPTS_PER_STEP:
        new_count = 0
        idx = min(lockout_level, len(LOCKOUT_DURATIONS) - 1)
        locked_until = current + LOCKOUT_DURATIONS[idx]
        new_level = min(lockout_level + 1, len(LOCKOUT_DURATIONS))

    return new_count, new_level, locked_until


def clear_failures() -> tuple[int, int, None]:
    return 0, 0, None
