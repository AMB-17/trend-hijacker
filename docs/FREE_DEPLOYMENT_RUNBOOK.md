# Free Deployment Runbook (Vercel + Supabase + Upstash + GitHub Actions)

This runbook uses the new batch endpoints to keep the app updated without always-on workers.

For GitHub publishing automation under AMB-17, use:
- `docs/GITHUB_SETUP_AMB17.md`
- `scripts/setup-github-amb17.ps1`

## Architecture

- Web + API: Vercel
- Database: Supabase Postgres (free tier)
- Cache/queue compatibility: Upstash Redis (free tier)
- Scheduling: GitHub Actions cron

## 1) Create Managed Services

1. Create Supabase project and copy Postgres connection string.
2. Create Upstash Redis database and copy Redis URL.
3. Generate a long random cron secret.

## 2) Configure Vercel Environment Variables

Set these in the Vercel project:

- `DATABASE_URL` = Supabase Postgres URL
- `REDIS_URL` = Upstash Redis URL
- `CRON_SECRET` = your random secret
- `CORS_ORIGIN` = your Vercel frontend origin
- `NODE_ENV` = `production`
- `NEXT_PUBLIC_API_URL` = deployed API base URL (same project URL if monolithic)

## 3) Deploy and Initialize Database

After first deploy, run migrations against your production database.

If you use Prisma in your deployment pipeline, run your existing migration command used by this repo.

## 4) Add GitHub Secrets

In GitHub repository settings -> Secrets and variables -> Actions, add:

- `CRON_API_URL` = deployed API base URL, for example `https://your-app.vercel.app`
- `CRON_SECRET` = same value as Vercel `CRON_SECRET`

## 5) Enable Scheduled Job

Workflow file:
- `.github/workflows/scheduled-batch.yml`

It runs every 6 hours and calls:
- `POST /api/internal/cron/run-all`

## 6) Add Post-Deploy Sanity Check

One-command local/CI sanity check:

```bash
DEPLOY_URL=https://your-app.vercel.app CRON_SECRET=your-secret pnpm deploy:sanity
```

GitHub workflow file:
- `.github/workflows/deploy-sanity.yml`

Required GitHub secrets:
- `CRON_API_URL`
- `CRON_SECRET`

## 7) Test Manually

Run this command against production:

```bash
curl -X POST "https://your-app.vercel.app/api/internal/cron/run-all" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: your-secret" \
  -d '{"sources":["reddit","hackernews","rss"],"limitPerSource":20,"hoursBack":24,"maxTrends":12,"minMentions":4}'
```

Expected response contains:

```json
{"success":true,...}
```

## Endpoints Added

- `POST /api/internal/cron/ingest`
- `POST /api/internal/cron/process`
- `POST /api/internal/cron/run-all`

All endpoints require the header:
- `x-cron-secret: <CRON_SECRET>`

## Notes

- This is a strict-free, batch-based mode.
- Trend freshness is periodic, not real-time.
- Increase/decrease `limitPerSource` and schedule frequency to fit free-tier quotas.
