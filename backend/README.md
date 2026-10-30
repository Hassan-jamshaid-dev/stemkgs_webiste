# STEM Society Calendar API

FastAPI + Postgres logistics calendar backend (Asia/Karachi).

## Local setup

1. Copy `.env.example` → `.env` and set `DATABASE_URL` + `SESSION_SECRET`.
2. Create a Postgres database and least-privilege role matching `DATABASE_URL`.
3. Install and migrate:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

4. Check:
   - http://127.0.0.1:8000/health
   - http://127.0.0.1:8000/ready

Frontend preview stays on http://localhost:4173 (static site). CORS allowlists that origin.

## Schema (v1)

| Table | Purpose |
|-------|---------|
| `users` | P/VP editors; Argon2 hashes; lockout state |
| `auth_sessions` | httpOnly session token hashes + CSRF |
| `calendar_events` | society, name, start/end, room (normalized), school year |
| `audit_logs` | create/update/delete snapshots (not public) |

Timestamps use `timestamptz` with Asia/Karachi defaults.

## Auth (Chunk 2)

| Method | Path | Notes |
|--------|------|--------|
| POST | `/auth/login` | email + password + society; rate limit 10/min; lockout ladder in DB |
| POST | `/auth/logout` | requires session cookie + `X-CSRF-Token` |
| GET | `/auth/session` | `{ authenticated, user?, csrf_token? }` |
| GET | `/auth/me` | requires session |

Session cookie: `stem_cal_session` (httpOnly; `Secure` when `COOKIE_SECURE=true`).

School editor emails look like `first.lastNNNNN@kgs.edu.pk`. Society is a slug from `SOCIETIES` (login also accepts display forms such as `STEM Society`, normalized to `stem-society`).

### Local test editor (Hassan)

One real local account is seeded for calendar login testing (not the old dummy). Credentials live only in gitignored `scripts/users.local.json` or your password manager — **never commit plaintext passwords**.

```powershell
# Copy example → local file, fill email / password / society / role, then:
.\.venv\Scripts\python.exe scripts\seed_real_users.py scripts\users.local.json
.\.venv\Scripts\python.exe scripts\delete_dummy_user.py
```

Login (API or `calendar-login.html`): school email + password + society **Robotics** (or slug `robotics`). Role stored as `president` (P/VP capability; schema also accepts `editor`).

### Optional dummy seed (dev only)

Prefer the real local account above. If you still need a throwaway user before reals exist:

```powershell
$env:DUMMY_SEED_PASSWORD = "your-long-local-password"
.\.venv\Scripts\python.exe scripts\seed_dummy_user.py
```

Delete it with `scripts/delete_dummy_user.py` once reals are seeded.

### Tests

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

### Deploy

See [DEPLOY.md](DEPLOY.md). Localhost API + site preview are complete; free prod HTTPS needs host login from you.
