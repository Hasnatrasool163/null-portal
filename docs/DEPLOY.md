# Deployment notes

Any host is allowed (Vercel not required). Pick ONE before the event and rehearse.

## Option A: Vercel (app) + hosted Postgres (Neon / Supabase / Aiven / Render)
1. Create the DB, copy its connection string. Set `DATABASE_SSL=true` for hosted TLS databases.
2. Locally: put that URL in `.env.local`, run `npm run db:setup` (migrates and seeds the hosted DB).
3. Push repo to GitHub, import in Vercel, add env vars: `DATABASE_URL`, `DATABASE_SSL`, `SESSION_SECRET`, AI keys.
4. Open `/api/health` on the live URL: db must say "ok".
Set a project-level limit: `export const maxDuration = 60` is already on the AI route.

## Option B: Render / Railway / Fly with the Dockerfile
Create a Postgres + a web service from the repo (Dockerfile). Set the same env vars. The container applies migrations on start.

## Option C: Docker only (rules allow submitting Docker / compose files)
`docker compose --profile full up --build` (app + Postgres). Untested in the build sandbox: try it once on your machine.

## Freeze checklist (rules: any commit, push, build or deployment after the deadline = disqualification)
- [ ] Final `npm run check` passes locally.
- [ ] Final commit pushed BEFORE the deadline, deploy finished and smoke tested.
- [ ] Auto-deploy / preview deploys turned OFF. No scheduled jobs that redeploy.
- [ ] Do not rotate env vars or run seed/reset scripts on production after the deadline.
- [ ] Note the final commit SHA and deploy time in the README.
- [ ] Free tiers: sleeping services wake on the first request; free DBs may pause. Warm everything up before your Day 2 slot.
