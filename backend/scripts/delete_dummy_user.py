"""Delete the dummy P/VP account (and its sessions). Safe if already gone."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import delete, select

from app.db import SessionLocal
from app.models.session import AuthSession
from app.models.user import User

DUMMY_EMAIL = "dummy.president@kgs.edu.pk"


def main() -> None:
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == DUMMY_EMAIL))
        if user is None:
            print("Dummy user not found — nothing to delete.")
            return
        db.execute(delete(AuthSession).where(AuthSession.user_id == user.id))
        db.delete(user)
        db.commit()
        print(f"Deleted dummy user {DUMMY_EMAIL}")


if __name__ == "__main__":
    main()
