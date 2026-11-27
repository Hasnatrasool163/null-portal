# Engineering Decisions & Architecture Log

A quick-reference guide for teammates and judges explaining **why** key choices were made in `null-portal`.

## Core Domain Decisions

| # | Area | Decision | Rationale |
|---|---|---|---|
| 1 | **Roles & Deactivation** | Three roles: `ADMIN`, `EXAMINER`, `CANDIDATE`. Public `/register` creates `CANDIDATE` only. Deactivated users (`is_active = false`) cannot log in (`403`) and lose active sessions immediately (`401`). | Prevents privilege escalation; `getCurrentUser()` re-reads the user from PostgreSQL on every request so role/status changes take effect instantly. |
| 2 | **Access & Isolation** | Enforced in `src/server/services/**`. Wrong role returns `403`; hidden or cross-owner records return `404`. | Never leaks whether another examiner's exam/question or another candidate's attempt exists. |
| 3 | **Question Bank Locking** | Questions are private per examiner. Once referenced by a `PUBLISHED` or `CLOSED` exam, edits return `409`; examiners duplicate instead. Delete is a soft archive (`archived = true`). | Guarantees historical exams and analytics remain intact even if the bank evolves. |
| 4 | **Server-Derived Phases** | Stored `status` is `DRAFT \| PUBLISHED \| CLOSED`. Displayed phase (`DRAFT`, `UPCOMING`, `ONGOING`, `COMPLETED`) is computed in SQL from PostgreSQL `now()`. | Eliminates background cron drift and clock skew between app servers. |
| 5 | **Single Attempt & Window** | Candidates start anytime inside `[starts_at, ends_at]`. Deadline is `LEAST(now() + duration, ends_at)`. Enforced by a partial unique index `WHERE NOT is_sandbox`. | Prevents duplicate attempts under double-clicks or concurrent requests (`ON CONFLICT DO NOTHING` + resume). |
| 6 | **Grading & Publish Gate** | Objective MCQs auto-grade on submit; written answers are manual only (`0..max` in `0.5` steps). Results publish is blocked (`409`) until zero submitted attempts remain in `NEEDS_REVIEW`. | Prevents partial or inconsistent score releases to candidates. |
| 7 | **Scoring & Clamping** | `MCQ_SINGLE` supports optional negative marking (`0..1`, unanswered = `0`). `MCQ_MULTI` supports `PARTIAL` or `ALL_OR_NOTHING`. Totals are recomputed in one SQL statement and clamped `>= 0`. | Keeps per-answer scores and attempt totals transactionally consistent. |
| 8 | **Immutable Snapshots** | At attempt start, questions, marks, options (including `isCorrect`), and marking rules are copied into `attempt_questions` and `attempts`. `isCorrect` is stripped before results publish. | Grading never depends on live bank state, and answer keys cannot leak early. |
| 9 | **Seeded Shuffle** | Mulberry32 PRNG seeded by `attempts.seed` shuffles questions/options deterministically. | Refreshing or switching devices always shows the exact same order. |
| 10 | **Monotonic Timer & Lazy Expiry** | Client anchors `performance.now()` to `serverNow` + `deadlineAt`. Any attempt read/write or monitor poll runs `finalizeIfExpiredInTx` under `FOR UPDATE`, recording `submitted_at = deadline_at`. | Device wall-clock tampering cannot grant extra time; reports reflect the true cutoff. |
| 11 | **Advisory Incidents** | Tab switches, blur, copy/paste, disconnects, and late syncs are logged with server timestamps and explicitly labelled *"advisory indicator, not proof of misconduct"*. | Supports fair human review without unfair automated penalties. |
| 12 | **No Email Dependency** | Admin-created accounts and CSV-imported candidates receive one-time generated temporary passwords (shown once + CSV download). | Zero paid/external SMTP dependencies; works reliably offline and in demos. |
| 13 | **Audited Time Extensions** | Deadlines only move via examiner-granted extensions (`1..120` min + required reason), logged in `time_extensions` and delivered via heartbeat. | Transparent fairness valve for verified power or hardware disruptions. |

## Security Hardening

| ID | Vulnerability | Resolution |
|---|---|---|
| **ADM-108** | Stateless JWT cookies remained valid after `/api/auth/logout` until expiry. | Added `users.session_version` (Migration `009`), embedded `sv` in the JWT, verified `session_version = $2` in `userRepo.findById()`, and incremented `session_version` on logout. Zero extra DB queries per request. |
| **ADV-131** | Login rate limit trusted client-supplied `X-Forwarded-For` and lived in memory. | Added PostgreSQL-backed `rate_limit_hits` (Migration `009`), ignored `X-Forwarded-For` unless behind a trusted proxy (`VERCEL=1` or `TRUST_PROXY=true`), and added per-email login throttling (`10 / 60s`). |

## Innovation 5.3 — Failure-Resilient Examinations

- **Local-first durability**: Every edit writes to IndexedDB (`src/lib/offline-queue.ts`, `localStorage` fallback) with `seq` and `capturedElapsedMs` before syncing via `POST /api/attempts/[id]/sync`.
- **Bounded recovery without pausing the clock**: Late-arriving offline edits are accepted only if `capturedElapsedMs <= allowedDurationMs`, plausible against real elapsed time (`+5s` skew tolerance), and received within `deadline + recovery_window_seconds` (default `120s`, `0` disables).
- **Examiner oversight**: Accepted late edits are tagged `synced_late = true`, logged as `LATE_SYNC`, and can be discarded individually (`POST /api/attempts/[id]/discard-late/[answerId]`).
- **Residual risk**: A candidate who tampers with client memory while offline during the short recovery window could forge `capturedElapsedMs`; this is bounded by configurable window length (down to `0`), explicit `LATE_SYNC` flags, and examiner discard controls.
