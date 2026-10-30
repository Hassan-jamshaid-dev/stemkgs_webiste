"""FastAPI dependencies."""

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.constants import CSRF_HEADER
from app.db import get_db
from app.models.session import AuthSession
from app.models.user import User
from app.services.auth import get_session_from_request


def get_optional_auth(
    request: Request,
    db: Session = Depends(get_db),
) -> tuple[AuthSession, User] | None:
    return get_session_from_request(db, request)


def require_auth(
    request: Request,
    db: Session = Depends(get_db),
) -> tuple[AuthSession, User]:
    pair = get_session_from_request(db, request)
    if pair is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")
    return pair


def require_csrf(
    request: Request,
    x_csrf_token: str | None = Header(default=None, alias=CSRF_HEADER),
    auth: tuple[AuthSession, User] = Depends(require_auth),
) -> tuple[AuthSession, User]:
    session, user = auth
    if not x_csrf_token or x_csrf_token != session.csrf_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF validation failed.")
    # Safe methods shouldn't hit this; still enforce for mutating routes.
    if request.method.upper() in {"GET", "HEAD", "OPTIONS"}:
        return session, user
    return session, user
