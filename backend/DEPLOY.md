# Deploy API + Postgres (free tier)

Localhost is fully working. Production deploy needs **your** login to a free host — CLIs for Railway / Render / Fly / Neon are not authenticated on this machine, so the agent cannot finish HTTPS publish without you.

## Recommended free stack

1. **Postgres:** [Neon](https://neon.tech) free project → copy the connection string  
2. **API:** [Render](https://render.com) free Web Service **or** [Fly.io](https://fly.io) free allowance  
3. Set env vars on the host (same keys as `.env.example`):
   - `DATABASE_URL=postgresql+psycopg://...` (Neon URL; use `postgresql+psycopg://` scheme)
   - `SESSION_SECRET=` long random string  
   - `APP_ENV=production`  
   - `COOKIE_SECURE=true`  
   - `COOKIE_SAMESITE=none` if the static site origin differs from the API host (cross-site cookies)  
   - `CORS_ORIGINS=` your live site origin(s), comma-separated  
   - `SCHOOL_YEAR_CURRENT=2026-2027`  
   - `TZ=Asia/Karachi`
4. Deploy from `backend/` using the included `Dockerfile` (runs `alembic upgrade head` then uvicorn).
5. Seed authorized P/VP accounts against **production** `DATABASE_URL` via `scripts/seed_real_users.py` + a gitignored `users.local.json` (never commit passwords). Remove any leftover dummy with `scripts/delete_dummy_user.py`.
6. Point the static site at the API:

```html
<script>window.STEM_CALENDAR_API = "https://YOUR-API-HOST";</script>
```

(Do **not** deploy the static site to Vercel/Netlify unless you explicitly ask — Netlify is credit-blocked; localhost preview stays the default for the site.)

## Exact next step for you

1. Create a Neon project and copy the DB URL.  
2. Create a Render Web Service from this repo’s `backend/` folder (Docker).  
3. Paste env vars from `.env.example` with production values.  
4. After deploy, open `https://YOUR-API/health` and `/ready`.  
5. Tell the agent the API HTTPS URL + allowed CORS origin to wire `STEM_CALENDAR_API` on the live site.

## Local forever (already done)

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
alembic upgrade head
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend: `http://localhost:4173` · API: `http://localhost:8000`
