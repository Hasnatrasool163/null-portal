# null-portal — Secure Examination Management System

Full-stack web application for institutions to author, conduct, monitor, grade, and verify timed online examinations. Built with Next.js App Router, TypeScript, Tailwind v4, and PostgreSQL (`pg` with parameterized SQL and transactional locking).

## Quick Start

```bash
npm install
cp .env.example .env.local          # set DATABASE_URL and SESSION_SECRET (32+ chars)
npm run db:setup                    # applies migrations 001..008 and seeds demo data
npm run dev                         # http://localhost:3000
```

### Useful Commands
| Command | Purpose |
|---|---|
| `npm run dev` | Start Next.js development server |
| `npm run db:migrate` | Apply pending SQL migrations in `db/migrations/` |
| `npm run db:seed` | Idempotent demo data seed |
| `npm run seed:reset-demo` | Refresh live demo exams (`Computer Science Assessment`, `Timer Demo`) and remove `verify` test artifacts |
| `npm run verify` | Run 102 end-to-end API & business-rule checks against the running server |
| `npm run check` | TypeScript (`tsc --noEmit`) + ESLint + production `next build` |

## Demo Credentials (Password for all: `Demo1234`)

| Role | Email | What to explore |
|---|---|---|
| **Administrator** | `admin@demo.test` | Platform counts, `/admin/users` (create users with one-time temp password, change roles, deactivate), read-only `/exams` oversight |
| **Examiner 1** | `examiner1@demo.test` | 30 questions across 3 topics, 5 exams (Draft, Upcoming, Live 20m, Live 3m Timer Demo, Completed with 8 graded attempts + analytics + PDF) |
| **Examiner 2** | `examiner2@demo.test` | Private bank (4 Networking questions) — proves strict cross-examiner isolation (`404`) |
| **Candidates** | `candidate1@demo.test` – `candidate8@demo.test` | Enrolled in Upcoming, Live, Timer Demo, and Completed exams; `candidate1`–`candidate8` have published results + verifiable PDFs on **Mathematics Diagnostic (Completed)** |

## Architecture

```
Browser (React Hook Form + Zod + IndexedDB queue)
   -> Route Handler (src/app/api/** via authedRoute / publicRoute)
   -> Service Layer (src/server/services/** — business rules, RBAC, transactions)
   -> Repository Layer (src/server/repositories/** — parameterized SQL)
   -> PostgreSQL (db/migrations/001..008, CHECKs, partial UNIQUE indexes, real_attempts view)
```

## Implemented Innovation Challenge: 5.3 Failure-Resilient Examinations

Online exams fail when Wi-Fi drops, browsers crash, or power flickers — yet pausing the timer creates a cheating vector. **null-portal** solves both sides:

1. **Local durability before network**: Every answer edit is written first to **IndexedDB** (`src/lib/offline-queue.ts`, with automatic `localStorage` fallback) along with a monotonic sequence number (`seq`) and `capturedElapsedMs` measured on a monotonic `performance.now()` clock anchored to the last server sync.
2. **Server-enforced fixed deadline + bounded recovery window**: The timer never pauses. On reconnect (or with exponential backoff), queued answers flush via `POST /api/attempts/[id]/sync`. Answers arriving after the deadline are accepted **only** if:
   - `capturedElapsedMs <= allowedDurationMs` (captured before deadline),
   - `capturedElapsedMs <= realElapsedMs + 5s` (plausibility bound), and
   - they arrive within `deadline + recovery_window_seconds` (per-exam setting, default `120s`, `0` disables).
3. **Full transparency & examiner control**: Accepted late-synced answers are flagged `synced_late = true`, logged as `LATE_SYNC` incidents, and highlighted in the examiner's Grading view with a **Discard late answer** action (`POST /api/attempts/[id]/discard-late/[answerId]`). Out-of-window or implausible claims are rejected and logged as `LATE_REJECTED`.
4. **Fairness valve**: For verified hardware/power outages, the examiner can grant an audited individual time extension (`POST /api/attempts/[id]/extensions`, requiring a reason) which propagates live via the candidate's 10s heartbeat.

### How to Demo Innovation 5.3 Live
1. Log in as `candidate3@demo.test` / `Demo1234` and start **Computer Science Assessment (Live)**.
2. Open browser DevTools → **Network** → switch to **Offline** (or disable Wi-Fi).
3. Answer 2–3 questions: observe the offline alert banner, the **Offline · Queued N** status chip, and the server-anchored timer continuing without pausing.
4. Refresh the page while offline (or reconnect to **Online**): queued answers survive refresh and automatically flush via `/api/attempts/[id]/sync`, returning the chip to **Saved**.
5. Check the examiner's **Live Monitor** tab (`examiner1@demo.test`) to see disconnect count, offline duration, and advisory activity logs.

## All 8 Secondary Features
1. **Network-aware interface**: `/api/ping` latency & offline detection (`src/lib/use-network-status.ts`) shared with 5.3.
2. **Server-side PDF reports**: Candidate result PDF with QR code (`/api/attempts/[id]/report.pdf`) and Examiner exam summary PDF (`/api/exams/[id]/report.pdf`).
3. **Sandbox preview**: Examiner **Preview as candidate** (`/api/exams/[id]/sandbox`) with persistent SANDBOX banner and Reset, excluded everywhere via the `real_attempts` view.
4. **Bulk import**: Two-step validate → preview (row/field errors) → transactional commit for Questions (CSV/JSON) and Candidates (CSV with one-time generated temporary passwords & CSV download). Sample files in `public/samples/`.
5. **Question analytics**: Real-attempts-only Recharts accuracy/skip chart, distractor distribution, and declared vs observed difficulty mismatch flags.
6. **Verifiable reports**: Public `/verify/[code]` page showing only exam title, masked initials, score/band, issue date, and `VALID` / `REVOKED` / `SUPERSEDED` (auto-supersedes if grades change).
7. **Customizable workspace**: Server-persisted font size, warm-paper / dark / high-contrast theme, palette position, layout, and timer style (`/api/me/preferences`).
8. **Digital scratchpad**: Private autosaved notes + sketch canvas (`/api/attempts/[id]/scratchpad`), never graded.

## Submission Documentation
- [01-REQUIREMENTS-ANALYSIS.md](docs/submission/01-REQUIREMENTS-ANALYSIS.md)
- [02-DESIGN.md](docs/submission/02-DESIGN.md)
- [03-TRACEABILITY.md](docs/submission/03-TRACEABILITY.md)
