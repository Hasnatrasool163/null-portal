<p align="center">
  <img src="public/logo.svg" alt="null-portal emblem" width="72" height="72" />
</p>

# null-portal — Secure Examination Management System

Full-stack web application for institutions to create, conduct, monitor, grade, and verify timed online examinations. Built with **Next.js App Router**, **TypeScript**, **Tailwind CSS v4**, and **PostgreSQL** (`pg` parameterized SQL + transactional row locking).

## Quick Start

```bash
npm install
cp .env.example .env.local          # configure DATABASE_URL (or DATABASE_FALLBACK_URL) & SESSION_SECRET
npm run db:setup                    # applies migrations 001..009 and seeds demo data
npm run dev                         # http://localhost:3000
```

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js development server |
| `npm run db:migrate` | Apply pending SQL migrations (`db/migrations/001..009`) |
| `npm run db:seed` | Idempotent demo data seed |
| `npm run seed:reset-demo` | Refresh live demo exams (`Computer Science Assessment`, `Timer Demo`) and remove `verify` artifacts |
| `npm run verify` | Run **106** end-to-end API, security, and business-rule checks against the running server |
| `npm run check` | TypeScript (`tsc --noEmit`) + ESLint + production `next build` |

## Demo Credentials (Password for all: `Demo1234`)

| Role | Email | Highlights |
|---|---|---|
| **Administrator** | `admin@demo.test` | Platform counts, `/admin/users` (one-time temp passwords, role changes, instant deactivation), read-only `/exams` oversight |
| **Examiner 1** | `examiner1@demo.test` | 30 questions across 3 topics, 5 exams (Draft, Upcoming, Live 20m, Live 3m Timer Demo, Completed with 8 graded attempts + analytics + PDF) |
| **Examiner 2** | `examiner2@demo.test` | Private 4-question bank — demonstrates strict cross-examiner isolation (`404`) |
| **Candidates** | `candidate1@demo.test` – `candidate8@demo.test` | Enrolled in Upcoming, Live, Timer Demo, and Completed exams; published results + verifiable QR PDFs on **Mathematics Diagnostic (Completed)** |

## Architecture

```
Browser (React Hook Form + Zod + IndexedDB offline queue)
   -> Route Handler (src/app/api/** via authedRoute / publicRoute)
   -> Service Layer (src/server/services/** — business rules, RBAC, transactions)
   -> Repository Layer (src/server/repositories/** — parameterized SQL)
   -> PostgreSQL (db/migrations/001..009 — CHECKs, partial UNIQUEs, real_attempts view)
```

## Innovation Challenge: 5.3 Failure-Resilient Examinations

- **Local durability before network**: Every answer edit writes to **IndexedDB** (`src/lib/offline-queue.ts`, `localStorage` fallback) with monotonic `seq` and `capturedElapsedMs` anchored to `serverNow` via `performance.now()`. Survives page refresh, crash, and power loss.
- **No extra time**: The server deadline never pauses. On reconnect (or exponential backoff), queued edits flush via `POST /api/attempts/[id]/sync`. Late answers are accepted only if `capturedElapsedMs <= allowedDurationMs`, plausible against real elapsed time, and received within `deadline + recovery_window_seconds` (configurable per exam; `0` disables).
- **Examiner oversight & fairness valve**: Late-recovered answers are marked `synced_late = true`, logged as `LATE_SYNC`, and can be discarded individually (`POST /api/attempts/[id]/discard-late/[answerId]`). Verified hardware outages are handled via audited time extensions (`POST /api/attempts/[id]/extensions`).

### Live Demo Steps (5.3)
1. Log in as `candidate3@demo.test` / `Demo1234` and start **Computer Science Assessment (Live)**.
2. Open DevTools → **Network** → set throttling to **Offline** (or disconnect Wi-Fi).
3. Answer 2–3 questions — observe the offline banner, **Offline · Queued N** status chip, and uninterrupted countdown.
4. Refresh the page or switch back to **Online** — queued answers persist and flush automatically via `/api/attempts/[id]/sync`, returning to **Saved**.
5. Open the examiner's **Live Monitor** tab (`examiner1@demo.test`) to view disconnect counts, offline duration, and advisory activity logs.

## 8 Secondary Features

1. **Network-aware interface**: `/api/ping` latency & offline monitor (`src/lib/use-network-status.ts`).
2. **Server-side PDF reports**: Candidate verifiable result PDF (`/api/attempts/[id]/report.pdf`) and Examiner summary PDF (`/api/exams/[id]/report.pdf`).
3. **Sandbox preview**: Examiner **Preview as candidate** (`/api/exams/[id]/sandbox`) with SANDBOX banner & Reset, excluded everywhere via `real_attempts`.
4. **Bulk import**: Two-step validate → row-level preview → transactional commit for Questions (CSV/JSON) and Candidates (CSV with one-time temporary passwords). Sample files in `public/samples/`.
5. **Question analytics**: Real-attempts-only Recharts accuracy/skip chart, distractor distribution, and declared vs observed difficulty mismatch flags.
6. **Verifiable reports**: Public `/verify/[code]` page showing exam title, masked initials, score/band, issue date, and `VALID` / `REVOKED` / `SUPERSEDED`.
7. **Customizable workspace**: Server-persisted font size, warm-paper / dark / high-contrast theme, palette position, layout, and timer style (`/api/me/preferences`).
8. **Digital scratchpad**: Private autosaved notes + sketch canvas (`/api/attempts/[id]/scratchpad`), never graded.

## Documentation

| Doc | Contents |
|---|---|
| [docs/DECISIONS.md](docs/DECISIONS.md) | Teammate quick-reference of all 13 domain decisions, security fixes (`ADM-108`, `ADV-131`), and Innovation 5.3 |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Environment variables (including fallback DB), migrations, and Vercel deployment |
| [docs/submission/01-REQUIREMENTS-ANALYSIS.md](docs/submission/01-REQUIREMENTS-ANALYSIS.md) | Detailed requirements, resolved assumptions, and residual-risk analysis |
| [docs/submission/02-DESIGN.md](docs/submission/02-DESIGN.md) | Mermaid ERD, schema constraints/indexes, concurrency patterns, and monotonic clock |
| [docs/submission/03-TRACEABILITY.md](docs/submission/03-TRACEABILITY.md) | Requirement → code → `verify.mjs` traceability matrix and honest gaps |
