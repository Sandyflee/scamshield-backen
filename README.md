# ScamShield Backend

Node.js/Express backend for ScamShield — same pattern as your CyberSafe SME setup.
Keeps your Anthropic API key server-side and stores/aggregates community reports.

## Endpoints

- `POST /api/analyze` — body: `{ platform, message, image?: { mediaType, dataBase64 } }` → returns the risk analysis JSON
- `POST /api/reports` — body: `{ message, platform, category, country, notes }` → stores a report, groups it with similar ones
- `GET /api/reports/trending?category=&search=` — returns report groups with 3+ reports (the moderation threshold)
- `GET /api/stats` — returns `{ analyzed, usersProtected, reportsToday, totalReportGroups }`

## Local setup

```bash
npm install
cp .env.example .env
# add your real ANTHROPIC_API_KEY to .env
npm start
```

## Deploying to Render

1. Push this folder to a GitHub repo (can be a `backend/` folder inside your existing ScamShield repo)
2. In Render: New → Web Service → connect the repo
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variable `ANTHROPIC_API_KEY` in Render's dashboard (never commit your real key)
6. Once deployed, update the frontend to call `https://your-render-url.onrender.com/api/analyze` and `/api/reports` instead of calling Anthropic directly

## Important: storage is temporary right now

`db.js` uses a simple JSON file (`db.json`) for storage. This is fine for testing, but
**Render's free tier has an ephemeral filesystem** — `db.json` resets every time the
service redeploys or restarts. Before real launch, do one of:

- Add a Render persistent disk (paid tier), or
- Migrate `db.js` to a real database — a free-tier Postgres (Render, Supabase, or Neon)
  is the natural next step. Only `db.js` would need to change; every route calls its
  functions (`addReport`, `getTrending`, `getStats`, `recordAnalysis`) without knowing
  how storage works underneath, so the migration is contained to one file.

## Rate limiting

`routes/analyze.js` has a simple per-IP limit (20 requests/minute) to protect your
Anthropic spend from abuse. Fine for launch; revisit if you see real traffic.
