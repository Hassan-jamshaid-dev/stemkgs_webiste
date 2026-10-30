# Deploy API + Postgres (free tier)

## Status (this machine)

| Piece | Status |
| --- | --- |
| Neon CLI | Authenticated |
| Render CLI | Authenticated (`m.hassanjamshaid224@gmail.com`) |
| Neon Postgres | Project `stem-society-calendar` (`spring-sound-70797022`) live; migrations applied; demo user seeded (hash only) |
| Render Web Service | **Blocked** — API returns **402 Payment information required** even for `plan: free` |
| Frontend | `js/calendar.js` uses `https://stem-society-calendar-api.onrender.com` when hostname is `*.vercel.app` |

## Blocker — add a card on Render, then retry

Render now requires a payment method before creating **any** service (including free/sleep). Free tier itself can stay $0 with sleep/cold starts.

1. Open billing and add a card (agent cannot complete this):  
   https://dashboard.render.com/billing
2. After the card is saved, tell the agent **“retry Render deploy”** (or run the commands below yourself).

### Exact retry commands (PowerShell)

```powershell
cd "C:\Users\Solar Turbines User\STEM society website"

# Connection string: Neon console → project stem-society-calendar → Connection details
# Use scheme postgresql+psycopg:// (not postgresql://)
$db = "postgresql+psycopg://neondb_owner:YOUR_PASSWORD@ep-plain-wind-b74t4tdh.c-13.us-east-1.aws.neon.tech/neondb?sslmode=require"
$secret = -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 48 | ForEach-Object {[char]$_})

render services create `
  --name stem-society-calendar-api `
  --type web_service `
  --repo https://github.com/Hassan-jamshaid-dev/stemkgs_webiste.git `
  --branch main `
  --runtime docker `
  --root-directory backend `
  --region oregon `
  --plan free `
  --health-check-path /health `
  --env-var "DATABASE_URL=$db" `
  --env-var "SESSION_SECRET=$secret" `
  --env-var "APP_ENV=production" `
  --env-var "COOKIE_SECURE=true" `
  --env-var "COOKIE_SAMESITE=none" `
  --env-var "CORS_ORIGINS=https://stem-society-website.vercel.app,http://localhost:4173,http://127.0.0.1:4173" `
  --env-var "SCHOOL_YEAR_CURRENT=2026-2027" `
  --env-var "TZ=Asia/Karachi" `
  --confirm -o json
```

Or from the dashboard: New → Blueprint → `render.yaml` at repo root (set `DATABASE_URL` when prompted).

3. Wait until `https://stem-society-calendar-api.onrender.com/health` returns OK (first free-tier wake can take ~1 min).
4. Then: commit/push (if needed) and `vercel --prod --yes`; verify login on  
   https://stem-society-website.vercel.app/calendar-login.html

### Demo account (already seeded in Neon)

- Email: `m.jamshaid16772@kgs.edu.pk`
- Society: `robotics`
- Password: only in local `backend/scripts/users.local.json` (gitignored) — never commit plaintext.

## Local forever (already done)

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
alembic upgrade head
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend: `http://localhost:4173` · API: `http://localhost:8000`
