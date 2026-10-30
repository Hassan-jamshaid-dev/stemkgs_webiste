"""Pytest fixtures — uses local DATABASE_URL; cleans rows created in tests."""

from __future__ import annotations

import os
import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete

# Ensure settings load from backend/.env
os.chdir(os.path.dirname(os.path.dirname(__file__)))

from app.config import get_settings  # noqa: E402
from app.db import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models.audit import AuditLog  # noqa: E402
from app.models.event import CalendarEvent  # noqa: E402
from app.models.session import AuthSession  # noqa: E402
from app.models.user import User  # noqa: E402
from app.security.passwords import hash_password  # noqa: E402
from app.security.rate_limit import login_rate_limiter  # noqa: E402

TEST_PREFIX = "pytest-"


@pytest.fixture(autouse=True)
def _reset_rate_limit() -> Generator[None, None, None]:
    login_rate_limiter.reset("login:testclient")
    login_rate_limiter.reset("login:127.0.0.1")
    yield
    login_rate_limiter.reset("login:testclient")
    login_rate_limiter.reset("login:127.0.0.1")


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    with TestClient(app, base_url="http://testserver") as c:
        yield c


@pytest.fixture()
def maths_user() -> Generator[User, None, None]:
    password = "Pytest-Maths-Password-123!"
    email = f"{TEST_PREFIX}maths-{uuid.uuid4().hex[:8]}@kgs.edu.pk"
    with SessionLocal() as db:
        user = User(
            email=email,
            password_hash=hash_password(password),
            society="maths",
            role="editor",
            is_active=True,
            is_dummy=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        user_id = user.id

    yield type("U", (), {"id": user_id, "email": email, "password": password, "society": "maths"})()

    with SessionLocal() as db:
        db.execute(delete(AuditLog).where(AuditLog.actor_user_id == user_id))
        db.execute(delete(AuthSession).where(AuthSession.user_id == user_id))
        db.execute(
            delete(CalendarEvent).where(
                (CalendarEvent.created_by_user_id == user_id)
                | (CalendarEvent.event_name.like(f"{TEST_PREFIX}%"))
            )
        )
        db.execute(delete(User).where(User.id == user_id))
        db.commit()


@pytest.fixture()
def physics_user() -> Generator[User, None, None]:
    password = "Pytest-Physics-Password-123!"
    email = f"{TEST_PREFIX}physics-{uuid.uuid4().hex[:8]}@kgs.edu.pk"
    with SessionLocal() as db:
        user = User(
            email=email,
            password_hash=hash_password(password),
            society="physics",
            role="editor",
            is_active=True,
            is_dummy=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        user_id = user.id

    yield type("U", (), {"id": user_id, "email": email, "password": password, "society": "physics"})()

    with SessionLocal() as db:
        db.execute(delete(AuditLog).where(AuditLog.actor_user_id == user_id))
        db.execute(delete(AuthSession).where(AuthSession.user_id == user_id))
        db.execute(delete(CalendarEvent).where(CalendarEvent.created_by_user_id == user_id))
        db.execute(delete(User).where(User.id == user_id))
        db.commit()


@pytest.fixture()
def login(client: TestClient):
    def _login(user) -> str:
        r = client.post(
            "/auth/login",
            json={"email": user.email, "password": user.password, "society": user.society},
        )
        assert r.status_code == 200, r.text
        return r.json()["csrf_token"]

    return _login


@pytest.fixture()
def settings():
    return get_settings()
