# Deployment and Environment Guide

This guide covers environment configuration, database migrations, demo data seeding, and deployment for Null Portal.

## 1. Environment Variables

Copy `.env.example` to `.env.local` for local development. Never commit `.env.local` or any file containing real credentials.

### Application Variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Yes (unless fallback is set) | None | Primary PostgreSQL connection string (local or hosted). |
| `DATABASE_SSL` | No | `false` | Set `true` for hosted PostgreSQL requiring TLS. Also auto-enabled if `sslmode=require` or `sslmode=verify-full` is present in the URL. |
| `DATABASE_FALLBACK_URL` | No | None | Optional secondary PostgreSQL URL. Used automatically if `DATABASE_URL` is empty or `USE_FALLBACK_DB=true`. |
| `DATABASE_FALLBACK_SSL` | No | `true` in `.env.example` | Set `true` if the fallback PostgreSQL instance requires TLS. |
| `USE_FALLBACK_DB` | No | `false` | Set `true` to route app queries and CLI scripts to `DATABASE_FALLBACK_URL`. |
| `SESSION_SECRET` | Yes (production) | Dev-only fallback when `NODE_ENV !== "production"` | Random secret of at least 32 characters for signing `sid` JWT cookies. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `TRUST_PROXY` | No | `false` | Set `true` when running behind a reverse proxy that sets `X-Forwarded-For`. Not needed on Vercel, which sets `VERCEL=1` automatically. |
| `BASE` | No (test script only) | `http://localhost:3000` | Target base URL for `npm run verify`. |

### Unused Starter Variables

The repository retains the starter template's `src/lib/llm.ts` helper, which is only referenced by `GET /api/health` (to report configured provider names) and the unused starter route `POST /api/ai`. Null Portal examination features do not call any external AI or paid API. The variables `LLM_PROVIDER_ORDER`, `GEMINI_API_KEY`, `GEMINI_MODELS`, `GROQ_API_KEY`, `GROQ_MODELS`, `OPENROUTER_API_KEY`, and `OPENROUTER_MODELS` can be left blank.

## 2. Database Migrations and Seeding

Migrations live in `db/migrations/001_init.sql` through `016_disputes.sql`. Each migration runs inside a transaction and is recorded in `schema_migrations`, making `db:migrate` safe to re-run.

```bash
npm run db:migrate        # apply pending SQL migrations (001 through 016)
npm run db:seed           # idempotent demo users, question banks, exams, and completed results
npm run seed:reset-demo   # refresh live/upcoming demo exam windows and clean verify.* test rows
npm run db:reset          # destructive: drops schema public, re-migrates, and re-seeds
```

## 3. Deploying to Vercel

1. Import the repository (`https://github.com/Hasnatrasool163/null-portal`) in Vercel.
2. Configure **Project Settings -> Environment Variables**:
   - `DATABASE_URL` (hosted PostgreSQL connection string, e.g., Neon, Supabase, or Aiven)
   - `DATABASE_SSL=true`
   - `SESSION_SECRET` (32+ character random hex string)
3. Apply migrations and seed the production database once before opening the app:
   ```bash
   npm run db:setup
   ```
   (Run with `DATABASE_URL` pointing to the hosted database, or with `USE_FALLBACK_DB=true` and `DATABASE_FALLBACK_URL` configured.)
4. Deploy and confirm `GET /api/health` returns `{"ok":true,"data":{"db":"ok","aiProviders":[]}}`.
5. Optionally run the automated black-box verification suite against a clean deployment (ensure no demo account has an active browser session within the last 2 minutes due to single-active-session enforcement):
   ```bash
   BASE=https://null-portal.vercel.app npm run verify
   ```

## 4. Docker and Docker Compose Status

`Dockerfile` and `docker-compose.yml` are included from the starter template. `docker compose up -d db` starts a local PostgreSQL 16 container (`postgres:16-alpine`), and `docker compose --profile full up --build` defines a full-stack container profile. Neither the container image build nor the full Docker Compose profile was executed during final verification because Docker Desktop was not running on the verification host; local verification ran directly against Node.js 22 and local PostgreSQL.

## 5. Operational Notes for Judges

- **Single active session**: Each account allows one active session at a time (`SESSION_IDLE_SECONDS = 120`). If a demo account is already signed in on another browser or tab, a second login returns HTTP `409` (`SESSION_ACTIVE`) until the first session signs out or remains idle for 2 minutes.
- **Cold starts and free-tier limits**: Serverless deployments (such as Vercel Hobby) and free-tier managed PostgreSQL instances may experience a short cold-start delay on the first request after inactivity.
