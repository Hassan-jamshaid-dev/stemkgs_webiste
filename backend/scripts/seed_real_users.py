"""
Seed real P/VP accounts from a local JSON file (never commit that file).

Input file format (array):
[
  {"email": "name.surname@khs.edu.pk", "password": "...", "society": "stem-society", "role": "president"},
  ...
]

Society values are stored as SOCIETIES slugs (spaces → hyphens). Optional role
defaults to "editor" (P/VP capability); use "president" / "vice-president" if desired.

Usage (from backend/):
  .\\.venv\\Scripts\\python.exe scripts\\seed_real_users.py path\\to\\users.local.json

After seeding reals, delete the dummy account:
  .\\.venv\\Scripts\\python.exe scripts\\delete_dummy_user.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.constants import SOCIETIES
from app.db import SessionLocal
from app.models.user import User
from app.security.passwords import hash_password


def _normalize_society(society: str) -> str:
    return society.strip().lower().replace(" ", "-")


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: seed_real_users.py <users.local.json>", file=sys.stderr)
        sys.exit(1)
    path = Path(sys.argv[1])
    if not path.exists():
        print(f"File not found: {path}", file=sys.stderr)
        sys.exit(1)
    if "local" not in path.name.lower():
        print("Refuse: filename should include 'local' so it is not committed.", file=sys.stderr)
        sys.exit(2)

    rows = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(rows, list) or not rows:
        print("JSON must be a non-empty array.", file=sys.stderr)
        sys.exit(1)

    created = 0
    updated = 0
    with SessionLocal() as db:
        for row in rows:
            email = str(row["email"]).strip().lower()
            password = str(row["password"])
            society = _normalize_society(str(row["society"]))
            role = str(row.get("role", "editor")).strip().lower() or "editor"
            if len(role) > 16:
                raise SystemExit(f"Role too long for {email}")
            if society not in SOCIETIES:
                raise SystemExit(f"Unknown society for {email}: {society}")
            if len(password) < 8:
                raise SystemExit(f"Password too short for {email}")
            existing = db.scalar(select(User).where(User.email == email))
            if existing:
                existing.password_hash = hash_password(password)
                existing.society = society
                existing.role = role
                existing.is_active = True
                existing.is_dummy = False
                existing.failed_login_count = 0
                existing.lockout_level = 0
                existing.locked_until = None
                db.add(existing)
                updated += 1
            else:
                db.add(
                    User(
                        email=email,
                        password_hash=hash_password(password),
                        society=society,
                        role=role,
                        is_active=True,
                        is_dummy=False,
                    )
                )
                created += 1
        db.commit()
    print(f"Seeded reals: created={created} updated={updated}")
    print("Next: run scripts/delete_dummy_user.py when ready.")


if __name__ == "__main__":
    main()
