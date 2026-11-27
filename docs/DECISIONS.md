# Engineering Decisions and Architecture Log

A concise reference explaining the key domain, security, and architectural decisions in Null Portal. Every statement below matches the current implementation in `db/migrations/001..016` and `src/server/**`.

## Core Domain Decisions

| # | Area | Decision | Rationale |
|---|---|---|---|
| 1 | **Roles and Deactivation** | Three roles: `ADMIN`, `EXAMINER`, `CANDIDATE`. Public `/register` creates `CANDIDATE` only. Deactivated users (`is_active = false`) cannot log in (`403`) and lose active sessions immediately (`401`). | Prevents privilege escalation; `getCurrentUser()` re-reads the user from PostgreSQL on every request so role and status changes take effect immediately. |
| 2 | **Access and Tenant Isolation** | Enforced in `src/server/services/**`. Wrong role returns `403`; hidden or cross-owner records return `404`. | Never leaks whether another examiner's exam or question, or another candidate's attempt, exists. |
| 3 | **Question Bank Locking** | Questions are private per examiner. Once referenced by a `PUBLISHED` or `CLOSED` exam, edits return `409`; examiners duplicate instead. Deletion is a soft archive (`archived = true`). | Guarantees historical exams and analytics remain intact even as the bank evolves. |
| 4 | **Server-Derived Phases** | Stored `status` is `DRAFT`, `PUBLISHED`, or `CLOSED` (with a `cancelled` boolean for admin cancellations). Displayed phase (`DRAFT`, `UPCOMING`, `ONGOING`, `COMPLETED`) is computed in SQL from PostgreSQL `now()`. | Eliminates background cron drift and clock skew between application servers. |
| 5 | **Phase-Based Exam Lifecycle** | `editLevel()` (`src/shared/exam-lifecycle.ts`) defines three levels: `FULL` (`DRAFT`, or `PUBLISHED` with zero started attempts), `LIVE` (`ONGOING` or `startedAttempts > 0`: only `title`, `instructions` for new starts, and extending `endsAt` later), and `TITLE_ONLY` (`COMPLETED`, `CLOSED`, or `cancelled`: `title` only). Optimistic concurrency via `updatedAt` prevents lost updates. | Balances operational flexibility before candidates begin with strict fairness once attempts are underway. |
| 6 | **Single Attempt and Window** | Candidates start anytime inside `[starts_at, ends_at]`. Deadline is `LEAST(now() + duration, ends_at)`. Enforced by partial unique index `attempts_real_unique_idx` (`WHERE NOT is_sandbox`). | Prevents duplicate attempts under double-clicks or concurrent requests (`ON CONFLICT DO NOTHING` + resume). |
| 7 | **Grading and Publish Gate** | Objective MCQs auto-grade on submit; written answers are graded manually (`0..max` in `0.5` steps). Results publish is blocked (`409`) until zero submitted real attempts remain in `NEEDS_REVIEW`. Post-publish MCQ key errors are corrected via audited rescoring (`POST /api/exams/[id]/rescore`). | Prevents partial or inconsistent score releases and preserves a before/after audit trail for any answer-key correction. |
| 8 | **Scoring and Clamping** | `MCQ_SINGLE` supports optional negative marking (`0..1`, unanswered = `0`). `MCQ_MULTI` supports `PARTIAL` or `ALL_OR_NOTHING`. Totals are recomputed in one SQL statement and clamped `>= 0`. | Keeps per-answer scores and attempt totals transactionally consistent. |
| 9 | **Immutable Snapshots** | At attempt start, questions, marks, options (including `isCorrect`), duration, instructions, and marking settings are copied into `attempt_questions` and `attempts`. `isCorrect` is stripped before results publish. | Grading never depends on live bank state, and answer keys cannot leak early. |
| 10 | **Seeded Randomization** | Mulberry32 PRNG seeded by `attempts.seed` shuffles questions and/or options deterministically. | Refreshing or reconnecting always displays the exact same question and option order. |
| 11 | **Monotonic Timer and Lazy Expiry** | Client anchors `performance.now()` to `serverNow` and `deadlineAt`. Any attempt read/write or monitor poll runs `finalizeIfExpiredInTx` under `FOR UPDATE`, recording `submitted_at = deadline_at` and `submit_reason = 'TIMEOUT'`. | Device wall-clock tampering cannot grant extra time; reports reflect the true server cutoff. |
| 12 | **Advisory Incidents** | Tab switches, blur, fullscreen exit, copy/paste, disconnects, reconnects, and late syncs are logged with server timestamps and labelled as advisory indicators rather than proof of misconduct. | Supports fair human review without unfair automated penalties. |
| 13 | **No Email Dependency** | Admin-created accounts, password resets, and CSV-imported candidates receive one-time generated temporary passwords (displayed once, with CSV download for bulk imports). In-app notifications (`notifications` table) cover lifecycle events without SMTP. | Zero paid or external SMTP dependencies; works reliably offline and in demos. |
| 14 | **Audited Time Extensions** | Deadlines only move via examiner-granted extensions (`1..120` min + required reason), logged in `time_extensions` and `audit_log`, and delivered via heartbeat. | Transparent fairness valve for verified power or hardware disruptions. |
| 15 | **Append-Only Audit and Dispute History** | PostgreSQL `BEFORE UPDATE OR DELETE` triggers block modification or deletion of `audit_log` and `dispute_events` rows (with cascaded parent delete allowed on `dispute_events`). | Preserves tamper-evident accountability records for grading, lifecycle actions, and dispute resolutions. |

## Security Hardening

| ID | Issue | Resolution |
|---|---|---|
| **ADM-108** | Stateless JWT cookies remained valid after `/api/auth/logout` until expiry. | Added `users.session_version` (Migration `009`), embedded `sv` in the JWT, verified `session_version = $2` in `userRepo.findById()`, and bumped `session_version` on logout, password change, and admin password reset. |
| **ADV-131** | Login rate limit trusted client-supplied `X-Forwarded-For` and lived in memory. | Added PostgreSQL-backed `rate_limit_hits` (Migration `009`), ignored `X-Forwarded-For` unless behind a trusted proxy (`VERCEL=1` or `TRUST_PROXY=true`), and added per-email login throttling (`10 / 60s`). |
| **Single Active Session** | Concurrent sessions on one account could allow exam account sharing. | Added `users.active_session_id` and `users.session_seen_at` (Migration `014`) with `SESSION_IDLE_SECONDS = 120`. Second login returns `409 SESSION_ACTIVE` until sign-out or idle expiry. |
| **Admin Exam Cancel and Revocation** | Cancelling a live or published exam must invalidate active attempts and issued certificates. | `POST /api/admin/exams/[id]/close` with `cancel: true` (Migration `012`) finalizes in-progress attempts, blocks further writes (`409`), hides results (`403`), and revokes issued verification codes (`REVOKED`). |

## Innovation Challenges Implemented

### Innovation 5.3: Failure-Resilient Examinations
- **Local-first durability**: Every edit writes to IndexedDB (`src/lib/offline-queue.ts`, `localStorage` fallback) with monotonic `seq` and `capturedElapsedMs` before syncing via `POST /api/attempts/[id]/sync`.
- **Bounded recovery without pausing the clock**: Late-arriving offline edits are accepted only if `capturedElapsedMs <= allowedDurationMs`, plausible against real elapsed time (`+5s` skew tolerance), and received within `deadline + recovery_window_seconds` (default `120s`, configurable down to `0` to disable).
- **Examiner oversight**: Accepted late edits are tagged `synced_late = true`, logged as `LATE_SYNC`, and can be discarded individually (`POST /api/attempts/[id]/discard-late/[answerId]`).
- **Residual risk**: A candidate who tampers with client memory while offline during the short recovery window could forge `capturedElapsedMs`; this is bounded by configurable window length (down to `0`), explicit `LATE_SYNC` flags, and examiner discard controls.

### Innovation: Trust and Dispute Resolution (Result Disputes)
- **Two-level independent review**: Within 7 days of results publication (up to 5 disputes per attempt, max 1 active per question or whole result), a candidate may file a dispute (`OPEN`). The exam owner reviews (`UNDER_REVIEW`) and resolves with a mandatory written rationale (`RESOLVED` + `UPHELD` / `PARTIALLY_UPHELD` / `REJECTED`), optionally adjusting a written question's score in the same transaction.
- **Escalation to independent admin**: The candidate may accept (`CLOSED`) or escalate once within 7 days (`ESCALATED`) to an administrator (who is independent of the exam owner) for a final decision (`CLOSED`).
- **Transparency and integrity**: Every action appends to the DB-enforced append-only `dispute_events` timeline and writes to `audit_log`. Score changes snapshot `score_at_filing` and `score_after`, and previously issued PDF verification codes automatically report `SUPERSEDED`.
