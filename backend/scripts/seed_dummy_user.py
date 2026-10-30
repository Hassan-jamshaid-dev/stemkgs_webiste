"""
Seed exactly one dummy P/VP account for local/dev testing.

Password comes from env DUMMY_SEED_PASSWORD (or interactive prompt) —
never commit plaintext passwords.

Usage (from backend/):
  .\\.venv\\Scripts\\python.exe scripts\\seed_dummy_user.py
"""

from __future__ import annotations

import os
import sys
from getpass import getpass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.db import SessionLocal
from app.models.user import User
from app.security.passwords import hash_password

DUMMY_EMAIL = "dummy.president@kgs.edu.pk"
DUMMY_SOCIETY = "maths"


def main() -> None:
    password = os.environ.get("DUMMY_SEED_PASSWORD", "").strip()
    if not password:
        password = getpass("Dummy account password (not echoed): ").strip()
    if len(password) < 12:
        print("Password must be at least 12 characters.", file=sys.stderr)
        sys.exit(1)

    with SessionLocal() as db:
        existing = db.scalar(select(User).where(User.email == DUMMY_EMAIL))
        others = db.scalars(select(User).where(User.email != DUMMY_EMAIL)).all()
        if others:
            print(
                f"Refusing to seed: {len(others)} non-dummy user(s) already exist. "
                "Delete them first if you only want the dummy account.",
                file=sys.stderr,
            )
            sys.exit(2)

        if existing:
            existing.password_hash = hash_password(password)
            existing.society = DUMMY_SOCIETY
            existing.role = "editor"
            existing.is_active = True
            existing.is_dummy = True
            existing.failed_login_count = 0
            existing.lockout_level = 0
            existing.locked_until = None
            db.add(existing)
            action = "updated"
        else:
            user = User(
                email=DUMMY_EMAIL,
                password_hash=hash_password(password),
                society=DUMMY_SOCIETY,
                role="editor",
                is_active=True,
                is_dummy=True,
            )
            db.add(user)
            action = "created"

        db.commit()
        print(f"Dummy user {action}: {DUMMY_EMAIL} / society={DUMMY_SOCIETY}")
        print("Password is not printed. Store it in your password manager only.")


if __name__ == "__main__":
    main()
