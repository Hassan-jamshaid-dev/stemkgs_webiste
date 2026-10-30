"""Login lockout ladder."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db import SessionLocal
from app.models.user import User


def test_lockout_after_three_failures(client: TestClient, maths_user) -> None:
    for i in range(3):
        r = client.post(
            "/auth/login",
            json={
                "email": maths_user.email,
                "password": f"wrong-{i}",
                "society": maths_user.society,
            },
        )
        assert r.status_code in (401, 423), r.text

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == maths_user.email))
        assert user is not None
        assert user.lockout_level == 1
        assert user.locked_until is not None

    r = client.post(
        "/auth/login",
        json={
            "email": maths_user.email,
            "password": maths_user.password,
            "society": maths_user.society,
        },
    )
    assert r.status_code == 423

    # unlock for cleanup / later fixtures
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == maths_user.email))
        assert user is not None
        user.failed_login_count = 0
        user.lockout_level = 0
        user.locked_until = None
        db.add(user)
        db.commit()


def test_email_password_society_must_all_match(client: TestClient, maths_user) -> None:
    r = client.post(
        "/auth/login",
        json={
            "email": maths_user.email,
            "password": maths_user.password,
            "society": "physics",
        },
    )
    assert r.status_code == 401
