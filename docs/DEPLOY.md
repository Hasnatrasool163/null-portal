# Deployment & Environment Guide

## 1. Environment Variables

Copy `.env.example` to `.env.local` for local development (never commit `.env.local`).

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes* | Primary PostgreSQL connection string (local Postgres or hosted). |
| `DATABASE_SSL` | No | Set `true` for hosted Postgres requiring TLS (auto-detected if `sslmode=require` is in the URL). |
| `DATABASE_FALLBACK_URL` | No* | Optional secondary/hosted PostgreSQL URL (e.g. Aiven/Neon/Supabase). Used automatically if `DATABASE_URL` is empty or `USE_FALLBACK_DB=true`. |
| `DATABASE_FALLBACK_SSL` | No | Set `true` if the fallback DB requires TLS. |
| `USE_FALLBACK_DB` | No | Set `true` to route traffic and scripts to `DATABASE_FALLBACK_URL`. |
| `SESSION_SECRET` | Yes (prod) | 32+ character random hex string (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). |
| `TRUST_PROXY` | No | Set `true` only when running behind your own reverse proxy (not needed on Vercel, which sets `VERCEL=1` automatically). |

## 2. Database Setup & Migrations

Migrations live in `db/migrations/001..009` and are idempotent:

```bash
npm run db:migrate        # apply any pending migrations
npm run db:seed           # seed demo users, questions, exams, and completed results
npm run seed:reset-demo   # refresh live demo exam windows & remove test artifacts
```

## 3. Deploying to Vercel

1. Import the GitHub repository in Vercel.
2. Add `DATABASE_URL` (your hosted PostgreSQL URL), `DATABASE_SSL=true`, and a 32+ char `SESSION_SECRET` in **Project Settings → Environment Variables**.
3. Run `npm run db:setup` locally pointed at the production DB (or via `USE_FALLBACK_DB=true`) to apply migrations `001`–`009` and seed demo data.
4. Deploy and verify `GET /api/health` returns `{"ok":true,"data":{"db":"ok",...}}`.
5. Run the automated verification suite against the deployed URL:
   ```bash
   BASE=https://your-deployment.vercel.app npm run verify
   ```
