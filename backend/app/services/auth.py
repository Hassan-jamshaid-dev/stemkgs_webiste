"""Login, logout, session lifecycle."""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.constants import SESSION_COOKIE, SESSION_TTL_HOURS, SOCIETIES
from app.models.session import AuthSession
from app.models.user import User
from app.security.lockout import clear_failures, is_locked, register_failure
from app.security.passwords import hash_password, needs_rehash, verify_password
from app.security.rate_limit import login_rate_limiter
from app.security.tokens import hash_token, new_token


def _tz() -> ZoneInfo:
    return ZoneInfo(get_settings().tz)


def _now() -> datetime:
    return datetime.now(_tz())


def _client_ip(request: Request) -> str:
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _normalize_society(society: str) -> str:
    return society.strip().lower()


def set_session_cookie(response: Response, raw_token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=SESSION_COOKIE,
        value=raw_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,  # type: ignore[arg-type]
        max_age=SESSION_TTL_HOURS * 3600,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(
        key=SESSION_COOKIE,
        path="/",
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,  # type: ignore[arg-type]
    )


def authenticate_login(
    db: Session,
    *,
    email: str,
    password: str,
    society: str,
    request: Request,
) -> tuple[User, str, str]:
    """
    Validate email+password+society. Returns (user, raw_session_token, csrf_token).
    """
    ip = _client_ip(request)
    rate_key = f"login:{ip}"
    if not login_rate_limiter.allow(rate_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Try again in a minute.",
        )

    email_n = _normalize_email(email)
    society_n = _normalize_society(society)
    if society_n not in SOCIETIES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown society.")

    user = db.scalar(select(User).where(User.email == email_n))
    now = _now()

    # Uniform-ish failure path: do not reveal which field mismatched.
    def fail(existing: User | None) -> None:
        if existing is not None:
            if is_locked(existing.locked_until, now):
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail="Account temporarily locked. Try again later.",
                )
            count, level, locked_until = register_failure(
                failed_login_count=existing.failed_login_count,
                lockout_level=existing.lockout_level,
                now=now,
            )
            existing.failed_login_count = count
            existing.lockout_level = level
            existing.locked_until = locked_until
            db.add(existing)
            db.commit()
            if locked_until is not None:
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail="Account temporarily locked. Try again later.",
                )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email, password, or society.",
        )

    if user is None or not user.is_active:
        fail(user)
        raise AssertionError("unreachable")

    if is_locked(user.locked_until, now):
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Account temporarily locked. Try again later.",
        )

    if user.society != society_n or not verify_password(user.password_hash, password):
        fail(user)
        raise AssertionError("unreachable")

    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)

    cleared_count, cleared_level, cleared_until = clear_failures()
    user.failed_login_count = cleared_count
    user.lockout_level = cleared_level
    user.locked_until = cleared_until

    raw_token = new_token(32)
    csrf = new_token(24)
    session = AuthSession(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        csrf_token=csrf,
        expires_at=now + timedelta(hours=SESSION_TTL_HOURS),
        user_agent=(request.headers.get("user-agent") or "")[:500] or None,
        ip_address=ip[:64],
    )
    db.add(user)
    db.add(session)
    db.commit()
    db.refresh(user)
    return user, raw_token, csrf


def get_session_from_request(db: Session, request: Request) -> tuple[AuthSession, User] | None:
    raw = request.cookies.get(SESSION_COOKIE)
    if not raw:
        return None
    token_h = hash_token(raw)
    session = db.scalar(select(AuthSession).where(AuthSession.token_hash == token_h))
    if session is None or session.revoked_at is not None:
        return None
    now = _now()
    expires = session.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=_tz())
    if expires <= now:
        return None
    user = db.get(User, session.user_id)
    if user is None or not user.is_active:
        return None
    return session, user


def revoke_session(db: Session, session: AuthSession) -> None:
    session.revoked_at = _now()
    db.add(session)
    db.commit()
