<p align="center">
  <img src="public/logo.svg" alt="Null Portal emblem" width="72" height="72" />
</p>

# Null Portal - Secure Examination Management System

Full-stack web application for institutions to create, schedule, conduct, monitor, grade, dispute, and verify timed online examinations.

- **Live URL**: https://null-portal.vercel.app/
- **Repository**: https://github.com/Hasnatrasool163/null-portal
- **Team**: Muhammad Hasnat Rasool, Muhammad Hamad Jamal, Syed-Muhammad-Hussnain-Raza
- **Final Commit SHA / Deploy Time**: See Releases/Deployments (documentation prepared on branch `docs/submission-release-hygiene` from `dev` commit `9bb37ca`)

---

## 1. Test Credentials and Seeded Demo Exams

All seeded accounts share the password **`Demo1234`** (defined in `scripts/seed.mjs`).

| Role | Email | Password | What This Account Demonstrates |
|---|---|---|---|
| Administrator | `admin@demo.test` | `Demo1234` | Platform dashboard (`/dashboard`), user lifecycle and one-time temp passwords (`/admin/users`), read-only exam oversight + emergency close/cancel and owner reassignment (`/exams`), platform-wide audit log (`/admin/audit`), and escalated dispute final decisions (`/admin/disputes`). |
| Examiner 1 | `examiner1@demo.test` | `Demo1234` | Private bank of 30 questions across 3 topics (`/questions`), 5 seeded exams covering every lifecycle stage (`/exams`), sandbox preview, live monitor, grading (per-candidate and blind grade-by-question), disputes, analytics, and PDF/CSV reports. |
| Examiner 2 | `examiner2@demo.test` | `Demo1234` | Private 4-question Networking bank (`/questions`). Demonstrates strict cross-examiner tenant isolation (accessing Examiner 1's exams or questions returns `404`). |
| Candidates (1-8) | `candidate1@demo.test` through `candidate8@demo.test` | `Demo1234` | Enrolled in Upcoming, Live, Timer Demo, and Completed exams (`/dashboard`). All 8 have graded, published results and verifiable QR PDF reports on **Mathematics Diagnostic (Completed)**; candidates can take live exams, test offline sync, and file result disputes. |

> **Single-session note**: Each account allows one active session at a time (`SESSION_IDLE_SECONDS = 120`). Sign out before switching browsers on the same account, or wait 2 minutes after closing the previous tab.

### Seeded Demo Exams (Owned by `examiner1@demo.test`)

1. **CS Midterm Draft** (`DRAFT`) - 6 questions, 45 min, 5 candidates enrolled; ready to edit, preview in sandbox, or publish.
2. **General Science Quiz (Upcoming)** (`PUBLISHED`, phase `UPCOMING`) - 6 questions, 30 min, starts 24 hours from seed time, 8 candidates enrolled.
3. **Computer Science Assessment (Live)** (`PUBLISHED`, phase `ONGOING`) - 10 questions (MCQ single with 25% negative marking, MCQ multi with partial credit, and written), 20 min, 8 candidates enrolled. Recommended for full exam-taking and Innovation 5.3 offline-sync demos.
4. **Timer Demo (3 Minutes)** (`PUBLISHED`, phase `ONGOING`) - 4 questions, 3 min, all-or-nothing multi-select; designed for demonstrating real-time countdown and server-enforced timeout.
5. **Mathematics Diagnostic (Completed)** (`CLOSED`, phase `COMPLETED`, results published) - 10 questions, 8 graded real attempts with written feedback, analytics charts, downloadable PDFs, and verifiable QR codes.

### Resetting Demo State

```bash
npm run seed:reset-demo   # refreshes Live/Upcoming exam windows, clears live attempts/announcements, removes verify.* test rows; keeps Mathematics Diagnostic intact
npm run db:reset          # destructive full reset: drops schema public, re-runs migrations 001..016, and re-seeds
```

---

## 2. Implementation Status

| Area | Requirement | Status | Where to Find It (UI Path) |
|---|---|---|---|
| **Core 3.1** | Auth, RBAC, User Management | Done | `/login`, `/register`, `/admin/users`, `/settings` (password change) |
| **Core 3.2** | Question Bank Management | Done | `/questions` (Examiner) |
| **Core 3.3** | Exam Creation and Configuration | Done | `/exams` -> `/exams/[id]` (`Settings`, `Questions`, `Review` tabs) |
| **Core 3.4** | Candidate Enrollment and Access Control | Done | `/exams/[id]` (`Enrollments` tab), `/dashboard` (Candidate) |
| **Core 3.5** | Timed Examination Engine | Done | `/dashboard` -> System Check -> `/attempts/[id]` |
| **Core 3.6** | Submission, Auto-Grading, Manual Grading | Done | `/attempts/[id]` (submit receipt), `/exams/[id]` (`Grading` tab, including blind grade-by-question and answer-key rescore) |
| **Core 3.7** | Live Monitoring and Integrity Controls | Done | `/exams/[id]` (`Monitor` tab: live table, advisory incidents, announcements, time extensions) |
| **Core 3.8** | Results, Reports, and Auditability | Done | `/attempts/[id]/result`, `/exams/[id]` (`Audit` tab, CSV/PDF export), `/admin/audit` |
| **Secondary 4.1** | Network-Aware Interface | Done | Connection status chip and offline banner in `/attempts/[id]` (`/api/ping`) |
| **Secondary 4.2** | PDF Report Generation | Done | Download PDF on `/attempts/[id]/result` and `/exams/[id]` (`Grading` / summary) |
| **Secondary 4.3** | Examination Sandbox | Done | **Preview as candidate** button on `/exams/[id]` (SANDBOX banner + Reset) |
| **Secondary 4.4** | Bulk Data Import | Done | **Import** buttons on `/questions` (CSV/JSON) and `/exams/[id]` -> `Enrollments` (CSV); sample files in `public/samples/` |
| **Secondary 4.5** | Question Analytics | Done | `/exams/[id]` (`Analytics` tab) |
| **Secondary 4.6** | Verifiable Reports | Done | Public `/verify` lookup and `/verify/[code]` (QR code on candidate PDF) |
| **Secondary 4.7** | Customizable Examination Workspace | Done | **Workspace preferences** inside `/attempts/[id]` (font size, theme, layout, navigator placement, timer style) |
| **Secondary 4.8** | Digital Scratchpad | Done | **Scratchpad** drawer inside `/attempts/[id]` (server-saved text notes + local freehand sketch canvas) |
| **Innovation 5.2** | Blueprint Difficulty Balancing | Not done | Not implemented (scoped out in favor of 5.3 and Result Disputes) |
| **Innovation 5.3** | Failure-Resilient Examinations | Done | Offline queue + bounded sync in `/attempts/[id]`; late-sync flags and discard controls in `/exams/[id]` (`Monitor` and `Grading` tabs) |
| **Innovation 5.4** | Trust and Dispute Resolution | Done | Candidate dispute filing on `/attempts/[id]/result`; Examiner review on `/exams/[id]` (`Disputes` tab); Admin escalation queue on `/admin/disputes` |

---

## 3. Innovation Challenges Implemented

To avoid double-counting: **Network-Aware Interface (4.1)** is a baseline secondary feature that detects and displays connection state. **Innovation 5.3** builds on top of it with local IndexedDB durability, monotonic sequence sync, bounded post-deadline recovery without pausing the exam clock, plausibility checks, and examiner late-answer discard controls. Similarly, **Grading and Auditability (3.6, 3.8)** are baseline requirements, while **Result Disputes (5.4)** adds a structured two-level appeals workflow with an append-only timeline and independent administrator escalation.

### 3.1 Innovation 5.3: Failure-Resilient Examinations

- **Problem**: Timed online exams routinely lose candidate answers during brief Wi-Fi drops, browser refreshes, or power interruptions, yet pausing the timer on disconnect would let candidates manufacture unlimited extra time.
- **Who it affects**: Candidates on unreliable networks and examiners who must preserve exam fairness without discarding legitimate work.
- **How it works**:
  1. Every answer edit writes to **IndexedDB** (`src/lib/offline-queue.ts`, with `localStorage` fallback) before attempting network delivery, recording a monotonic `seq` and `capturedElapsedMs` anchored to `serverNow` via `performance.now()`.
  2. The server deadline never pauses. On reconnect (or exponential backoff 2s to 15s), queued edits flush via `POST /api/attempts/[id]/sync`.
  3. Edits arriving after `deadline_at` are accepted only if `capturedElapsedMs <= allowedDurationMs`, plausible against real elapsed time (`+5s` skew tolerance), and received within `deadline_at + recovery_window_seconds` (default `120s`, configurable `0..600s` per exam; `0` disables late recovery completely).
  4. Accepted late edits are flagged `synced_late = true`, logged as `LATE_SYNC` incidents, and highlighted in Grading with a one-click **Discard late answer** control (`POST /api/attempts/[id]/discard-late/[answerId]`). Verified hardware outages are handled separately via audited time extensions (`POST /api/attempts/[id]/extensions`).
- **60-Second Demo**:
  1. Log in as `candidate3@demo.test` / `Demo1234` and start **Computer Science Assessment (Live)**.
  2. Open DevTools -> **Network** -> switch to **Offline**.
  3. Answer 2-3 questions: observe the offline banner, **Offline - Queued N** status chip, and uninterrupted server-anchored countdown.
  4. Refresh the page or switch back to **Online**: queued answers persist across reload and flush automatically via `/api/attempts/[id]/sync`, returning to **Saved**.
  5. Log in as `examiner1@demo.test` in another browser/incognito window and inspect `/exams/[id]` -> **Monitor** to view disconnect counts and advisory activity logs.
- **Trade-offs and known limits**: A technically sophisticated candidate who intentionally disconnects before the deadline and tampers with client memory while offline could forge `capturedElapsedMs` inside the short recovery window. Mitigations: bounded window (`0..600s`, set to `0` for high-stakes exams), explicit `LATE_SYNC` audit markers, and examiner one-click discard.

### 3.2 Innovation 5.4: Trust and Dispute Resolution (Result Disputes)

- **Problem**: Published exam scores can contain written-grading oversights or disputed questions, and informal email appeals lack transparency, deadlines, or an independent second reviewer.
- **Who it affects**: Candidates seeking fair review of published results, examiners managing regrade requests, and administrators overseeing institutional integrity.
- **How it works**:
  1. Within 7 days of results publication (up to 5 disputes per attempt, max 1 active per question or whole result), a candidate files a dispute (`OPEN`) with a category (`GRADING_ERROR`, `AMBIGUOUS_QUESTION`, `TECHNICAL_INCIDENT`, `OTHER`) and explanation.
  2. The exam owner moves it to `UNDER_REVIEW` and resolves it (`RESOLVED` + `UPHELD`, `PARTIALLY_UPHELD`, or `REJECTED`) with a mandatory written rationale and optional 0.5-step written-score update executed in the same transaction (`GRADE_CHANGED` in `audit_log`).
  3. The candidate can accept (`CLOSED`), withdraw prior to resolution (`WITHDRAWN`), or escalate once within 7 days (`ESCALATED`) to an administrator independent of the exam owner for a final decision (`CLOSED`).
  4. Every step appends to the DB-enforced append-only `dispute_events` table, snapshots `score_at_filing` and `score_after`, sends in-app notifications, and automatically marks previously issued PDF verification codes as `SUPERSEDED` if the score changes.
- **60-Second Demo**:
  1. Log in as `candidate1@demo.test` / `Demo1234`, open **Mathematics Diagnostic (Completed)** -> **View Result**, and file a dispute on a written question.
  2. Sign out and log in as `examiner1@demo.test`, open the same exam -> **Disputes** tab, review the candidate's answer and incident history, and submit a resolution with a rationale.
  3. Sign back in as `candidate1@demo.test` to either accept or escalate to an administrator; as `admin@demo.test`, open `/admin/disputes` to issue a final independent decision.
- **Trade-offs and known limits**: Automated verification in `scripts/verify.mjs` does not yet include a dedicated dispute slice (verified via TypeScript/ESLint/build and code review; see `docs/submission/03-TRACEABILITY.md`).

---

## 4. Architecture and Technology Choices

- **Next.js 16 (App Router) + React 19 + TypeScript 5**: Single full-stack codebase with strict end-to-end typing and server-side route handlers.
- **PostgreSQL + `pg` (parameterized SQL)**: Direct access to `FOR UPDATE` row locks, partial unique indexes, `DEFERRABLE` constraints, views (`real_attempts`), and append-only triggers without ORM abstraction leaks.
- **Zod v4 + React Hook Form**: Shared schemas in `src/shared/schemas/**` validate both client forms and API payloads.
- **Tailwind CSS v4 + Radix UI + Recharts + jsPDF + qrcode**: Accessible UI primitives, real-data analytics charts, and pure-JS server-side PDF/QR generation with zero headless-browser dependency.

```mermaid
flowchart TD
  Browser["Browser UI (Next.js Client + React Hook Form + Zod + IndexedDB Queue)"]
  API["Next.js Route Handlers (src/app/api/** via authedRoute / publicRoute)"]
  SVC["Service Layer (src/server/services/** - RBAC, Lifecycle, Transactions, Audit)"]
  REPO["Repository Layer (src/server/repositories/** - Parameterized pg SQL)"]
  DB[("PostgreSQL (Migrations 001..016, CHECKs, Partial UNIQUEs, real_attempts View, Append-Only Triggers)")]

  Browser -->|HTTPS + HttpOnly sid JWT| API
  API --> SVC
  SVC --> REPO
  REPO --> DB
```

---

## 5. Local Setup

### Prerequisites

- **Node.js**: 22.x (verified on `v22.23.2`)
- **npm**: 10.x (verified on `10.9.8`)
- **PostgreSQL**: 16+ (local installation, hosted instance, or Docker via `npm run db:up`)

### Clean-Clone Setup Commands

```bash
git clone https://github.com/Hasnatrasool163/null-portal.git
cd null-portal
npm ci
cp .env.example .env.local
# Edit .env.local: set DATABASE_URL (and DATABASE_SSL=true if hosted) and a 32+ char SESSION_SECRET
npm run db:setup       # runs migrations 001..016 and seeds demo data
npm run dev            # starts development server at http://localhost:3000
```

Generate a `SESSION_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Environment Variables

Only variables actually read in code (`src/` and `scripts/`) are listed below. Never commit real values.

| Variable | Purpose | Required | Example Format |
|---|---|---|---|
| `DATABASE_URL` | Primary PostgreSQL connection string | Yes (unless fallback is set) | `postgres://user:pass@localhost:5432/app` |
| `DATABASE_SSL` | Enable TLS for primary DB (`true`/`false`) | No | `false` |
| `DATABASE_FALLBACK_URL` | Optional secondary PostgreSQL URL (used if `DATABASE_URL` is empty or `USE_FALLBACK_DB=true`) | No | `postgres://user:pass@host:5432/db` |
| `DATABASE_FALLBACK_SSL` | Enable TLS for fallback DB (`true`/`false`) | No | `true` |
| `USE_FALLBACK_DB` | Route app and scripts to `DATABASE_FALLBACK_URL` | No | `false` |
| `SESSION_SECRET` | 32+ char secret signing `sid` JWT cookies | Yes (production) | `<64-char-hex-string>` |
| `TRUST_PROXY` | Set `true` behind a custom reverse proxy for rate limiting (auto-enabled on Vercel via `VERCEL=1`) | No | `false` |
| `BASE` | Target URL for `npm run verify` | No (test only) | `http://localhost:3000` |

*Note on starter AI variables*: `.env.example` also lists `LLM_PROVIDER_ORDER`, `GEMINI_API_KEY`, `GEMINI_MODELS`, `GROQ_API_KEY`, `GROQ_MODELS`, `OPENROUTER_API_KEY`, and `OPENROUTER_MODELS` for the unused starter helper `src/lib/llm.ts` (referenced only by `/api/health` and unused `/api/ai`). Null Portal examination features do not use any LLM or paid API; leave all AI keys blank.

### Checks and Verification

```bash
npm run check          # TypeScript (tsc --noEmit) + ESLint + production next build
npm run verify         # Black-box API/security/business-rule suite against running server (default http://localhost:3000)
npm run seed:reset-demo # Reset live/upcoming demo windows and remove verify.* test artifacts
```

*Verification transparency*: In a fresh clone on 2026-11-27, `npm ci` and `npm run check` passed cleanly (0 TypeScript errors, 0 ESLint errors, production build succeeded). Running `npm run verify` requires that no demo account has an active browser session within the last 120 seconds (otherwise single-active-session enforcement returns `409 SESSION_ACTIVE`).

---

## 6. Deployment

- **Hosting**: Vercel (Next.js App Router)
- **Database**: Managed PostgreSQL (e.g., Aiven, Neon, or Supabase) with TLS (`DATABASE_SSL=true`)
- **Configured Environment Variable Names**: `DATABASE_URL`, `DATABASE_SSL`, `SESSION_SECRET` (and optionally `DATABASE_FALLBACK_URL`, `DATABASE_FALLBACK_SSL`, `USE_FALLBACK_DB`)
- **Migrations and Seeding**: Applied via `npm run db:setup` (`node scripts/migrate.mjs && node scripts/seed.mjs`) pointing to the production database.
- **Judge Notes**:
  - Serverless cold starts and free-tier managed PostgreSQL wake-ups may add a brief delay on the first request after idle periods.
  - Because single-active-session enforcement is enabled, sign out of a demo account before logging into the same account in another browser (or wait 2 minutes).
  - See [docs/DEPLOY.md](docs/DEPLOY.md) for full deployment instructions.

---

## 7. Security and Integrity

- **Server-side authorization**: Every protected API route uses `authedRoute({ roles })` (`src/server/http.ts`) and service-layer ownership checks (`403` for wrong role, `404` for cross-owner records).
- **Session revocation and single active session**: `getCurrentUser()` verifies `users.is_active`, `users.session_version`, and `users.active_session_id` against PostgreSQL on every request. Logout, deactivation, password change, and admin password reset revoke sessions immediately.
- **Database-enforced deadlines and concurrency**: Exam phases derive from PostgreSQL `now()`; attempt start uses `ON CONFLICT DO NOTHING` + resume; autosave, sync, submit, lazy expiry (`finalizeIfExpiredInTx`), grading, and extensions lock the `attempts` row `FOR UPDATE`.
- **Immutable snapshots and no early key leaks**: Questions, marks, options, duration, instructions, and marking rules are copied into `attempt_questions` / `attempts` at start; `isCorrect` is stripped from candidate responses until results are published (and shown only when `show_answers` is enabled).
- **Idempotent submission and receipts**: Repeated submit calls return the same `receipt_code` (`NP-XXXX-XXXX`) without double-grading.
- **Dual-side validation and hardening**: Shared Zod schemas on client and server, PostgreSQL `CHECK` and partial `UNIQUE` constraints, DB-backed proxy-safe rate limiting (`rate_limit_hits`), HTTP security headers (`nosniff`, `DENY`, `Referrer-Policy`), and CSV formula-injection protection on import and export.
- **Append-only audit logging**: PostgreSQL triggers (`audit_log_no_change`, `dispute_events_no_change`) block `UPDATE` and `DELETE` on audit and dispute history.
- **What is NOT protected (known limits)**: Browser-based lockdown cannot prevent secondary physical devices, OS-level screen capture, or a determined user modifying client memory during the bounded offline recovery window (mitigated by setting `recovery_window_seconds = 0` on high-stakes exams and reviewing `LATE_SYNC` flags). Advisory incidents (tab blur, fullscreen exit, copy/paste) are signals for human review, not proof of misconduct.

---

## 8. Key Decisions and Assumptions

See [docs/submission/01-REQUIREMENTS-ANALYSIS.md](docs/submission/01-REQUIREMENTS-ANALYSIS.md) for the full requirement register, role matrix, and risk analysis, [docs/submission/02-DESIGN.md](docs/submission/02-DESIGN.md) for the ERD and flow sequence diagrams, [docs/submission/03-TRACEABILITY.md](docs/submission/03-TRACEABILITY.md) for traceability and test evidence, and [docs/DECISIONS.md](docs/DECISIONS.md) for the engineering decisions log.

---

## 9. Known Limitations and Not-Implemented Items

- **Innovation 5.2 (Blueprint difficulty balancing)** is not implemented.
- **Automated verification coverage**: `scripts/verify.mjs` covers migrations `001` through `013` (auth, bank, exams, attempts, grading, monitoring, secondary features, Innovation 5.3, security hardening, receipts, audit, lifecycle, password reset), but does not yet include automated test slices for single active session (`014`), in-app notifications (`015`), or result disputes (`016`).
- **Docker build untested**: `Dockerfile` and `docker-compose.yml` are provided from the starter template but were not built or run during final verification.
- **Freehand sketch persistence**: Text scratchpad notes persist server-side in PostgreSQL (`attempts.scratchpad`), whereas freehand sketch strokes are stored per attempt in browser `localStorage` and cleared on submission.
- **Blind grading scope**: Grade-by-question hides candidate names to reduce bias, but the examiner can still switch to the per-candidate grading view.
- **No email delivery**: One-time temporary passwords are displayed once in the UI (and downloadable as CSV for bulk imports); no SMTP server is configured.

---

## 10. Data and AI Statement

- All seeded users, question banks, exams, attempts, grades, and verification reports are **fictional and simulated** for demonstration purposes.
- AI-assisted coding tools were used during development in accordance with the competition rules.
- Null Portal itself uses **no paid external APIs and no AI services** for any examination, grading, monitoring, or reporting workflow (the starter template's `src/lib/llm.ts` and `/api/ai` remain unused in the repository and require no API keys).
