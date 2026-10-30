"""Auth endpoints: login, logout, session."""

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_optional_auth, require_auth, require_csrf
from app.db import get_db
from app.models.session import AuthSession
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, SessionResponse, UserPublic
from app.services.auth import (
    authenticate_login,
    clear_session_cookie,
    revoke_session,
    set_session_cookie,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _public_user(user: User) -> UserPublic:
    return UserPublic(email=user.email, society=user.society, role=user.role)


@router.post("/login", response_model=LoginResponse)
def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> LoginResponse:
    user, raw_token, csrf = authenticate_login(
        db,
        email=str(body.email),
        password=body.password,
        society=body.society,
        request=request,
    )
    set_session_cookie(response, raw_token)
    return LoginResponse(user=_public_user(user), csrf_token=csrf)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    db: Session = Depends(get_db),
    auth: tuple[AuthSession, User] = Depends(require_csrf),
) -> None:
    session, _user = auth
    revoke_session(db, session)
    clear_session_cookie(response)


@router.get("/session", response_model=SessionResponse)
def session_status(
    auth: tuple[AuthSession, User] | None = Depends(get_optional_auth),
) -> SessionResponse:
    if auth is None:
        return SessionResponse(authenticated=False)
    session, user = auth
    return SessionResponse(
        authenticated=True,
        user=_public_user(user),
        csrf_token=session.csrf_token,
    )


@router.get("/me", response_model=UserPublic)
def me(auth: tuple[AuthSession, User] = Depends(require_auth)) -> UserPublic:
    _session, user = auth
    return _public_user(user)
