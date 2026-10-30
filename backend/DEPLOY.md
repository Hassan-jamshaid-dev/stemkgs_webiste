# Deploy Calendar API (Vercel + Neon)

## Status

| Piece | Status |
| --- | --- |
| Neon Postgres | Live and seeded (`stem_calendar`) |
| API host | **Vercel** project `stem-society-calendar-api` (no card) |
| Render | Skip — 402 requires payment method |
| Frontend | `js/calendar.js` → `https://stem-society-calendar-api.vercel.app` on `*.vercel.app` |

## Why Vercel (not Render)

Render free tier now requires a card (402). The site already deploys on Vercel; the FastAPI app is a second Vercel project under the same account. Neon stays as-is.

Cross-site cookies (static site ↔ API subdomain):

- `COOKIE_SECURE=true`
- `COOKIE_SAMESITE=none`
- `CORS_ORIGINS` includes `https://stem-society-website.vercel.app`

## Production URLs

- API: https://stem-society-calendar-api.vercel.app
- Health: https://stem-society-calendar-api.vercel.app/health
- Site login: https://stem-society-website.vercel.app/calendar-login.html

## Redeploy API (from `backend/`)

```powershell
cd "C:\Users\Solar Turbines User\STEM society website\backend"
vercel --prod --yes
```

Env vars (Production) must include `DATABASE_URL`, `SESSION_SECRET`, `APP_ENV=production`, `COOKIE_SECURE=true`, `COOKIE_SAMESITE=none`, `CORS_ORIGINS`, `SCHOOL_YEAR_CURRENT`, `APP_TZ=Asia/Karachi` (do not use `TZ` — reserved on Vercel).

## Demo account (seeded in Neon)

- Email: `m.jamshaid16772@kgs.edu.pk`
- Society: `robotics`
- Password: only in local `backend/scripts/users.local.json` (gitignored)

## Local

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
alembic upgrade head
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend: `http://localhost:4173` · API: `http://localhost:8000`
