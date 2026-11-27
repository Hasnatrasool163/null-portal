# 03 - Requirements Traceability, Validation, Access Control, and Test Evidence

## 1. Requirement -> Design -> Implementation -> Verification Matrix

| Req ID | Requirement | Design / DB Objects | Implementation Files / Functions | How Verified |
|---|---|---|---|---|
| **3.1** | Auth, RBAC, User CRUD, Deactivation, Password Change/Reset | `users` (`role`, `is_active`, `session_version`, `active_session_id`), `rate_limit_hits` | `src/server/services/auth.service.ts`, `src/server/services/user.service.ts`, `src/server/auth/session.ts`, `src/server/auth/current-user.ts`, `src/app/api/auth/**`, `src/app/api/admin/users/**`, `src/components/users-manager.tsx`, `src/components/settings-view.tsx` | `scripts/verify.mjs` (`slice0`, `securityRegression`, `passwordSlice`); single-active-session (`014`) verified live via `409 SESSION_ACTIVE` + `npm run check` |
| **3.2** | Private Question Bank, Topics, Locking, Duplicate, Archive | `topics`, `questions`, `question_options` (`004`) | `src/server/services/topic.service.ts`, `src/server/services/question.service.ts`, `src/app/api/topics/**`, `src/app/api/questions/**`, `src/components/questions-manager.tsx` | `scripts/verify.mjs` (`slice1`, `slice2` lock check, `featureSlice`) + `npm run check` |
| **3.3** | Exam Creation, Server-Derived Phases, Lifecycle Edit Rules, Clone, Admin Close/Cancel/Owner | `exams`, `exam_questions`, `exam_rescores`, `answer_rescores` (`005`, `012`) | `src/shared/exam-lifecycle.ts`, `src/server/exam/lifecycle.ts`, `src/server/services/exam.service.ts`, `src/app/api/exams/**`, `src/app/api/admin/exams/**`, `src/components/exam-detail.tsx`, `src/components/exam-lifecycle-panels.tsx` | `scripts/verify.mjs` (`slice2`, `featureSlice`, `lifecycleSlice`) + `npm run check` |
| **3.4** | Candidate Enrollment (Manual + CSV) and Candidate Dashboard | `enrollments` (`005`), `notifications` (`015`) | `src/server/services/enrollment.service.ts`, `src/server/import/candidates-import.ts`, `src/app/api/exams/[id]/enrollments/**`, `src/app/api/my/exams/route.ts`, `src/components/candidate-home.tsx` | `scripts/verify.mjs` (`slice2`, `slice6`, `lifecycleSlice`) + `npm run check`; notifications (`015`) verified via code inspection + `npm run check` |
| **3.5** | Timed Exam Engine, Snapshot, Seeded Shuffle, Monotonic Timer, Lazy Expiry, System Check | `attempts`, `attempt_questions`, `answers`, `real_attempts` (`006`, `010`, `011`, `012`) | `src/server/exam/prng.ts`, `src/server/services/attempt.service.ts`, `src/app/api/exams/[id]/start/route.ts`, `src/app/api/attempts/[id]/**`, `src/app/api/system-check/route.ts`, `src/components/exam-workspace.tsx`, `src/components/system-check.tsx` | `scripts/verify.mjs` (`slice3`, `hardening`, `featureSlice`) + `npm run check` |
| **3.6** | Idempotent Submit, Receipt Code, MCQ Auto-Grade, Written Manual Grade, Blind Grade-by-Question, Publish Gate, Rescore | `attempts.receipt_code`, `answers`, `exam_rescores`, `answer_rescores` (`006`, `010`, `012`) | `src/server/exam/scoring.ts`, `src/server/services/grading.service.ts`, `src/app/api/attempts/[id]/submit/route.ts`, `src/app/api/attempts/[id]/grade/[aqId]/route.ts`, `src/app/api/exams/[id]/results/publish/route.ts`, `src/app/api/exams/[id]/rescore/route.ts`, `src/components/exam-grading-tab.tsx`, `src/components/grade-by-question.tsx` | `scripts/verify.mjs` (`slice4`, `hardening`, `featureSlice`, `lifecycleSlice`) + `npm run check` |
| **3.7** | Live Monitoring, Advisory Incidents, Announcements, Time Extensions | `incidents`, `announcements`, `time_extensions` (`007`) | `src/server/services/monitoring.service.ts`, `src/app/api/exams/[id]/monitor/route.ts`, `src/app/api/exams/[id]/announcements/route.ts`, `src/app/api/attempts/[id]/heartbeat/route.ts`, `src/app/api/attempts/[id]/incidents/route.ts`, `src/app/api/attempts/[id]/extensions/route.ts`, `src/components/exam-monitor-tab.tsx` | `scripts/verify.mjs` (`slice5`) + `npm run check` |
| **3.8** | Results View, CSV Export, Append-Only Audit Log | `audit_log` + `audit_log_no_change` trigger (`010`, `012`, `013`, `016`) | `src/server/audit.ts`, `src/server/csv.ts`, `src/app/api/exams/[id]/results.csv/route.ts`, `src/app/api/admin/audit/route.ts`, `src/app/api/exams/[id]/audit/route.ts`, `src/components/attempt-result-view.tsx`, `src/components/audit-log-view.tsx` | `scripts/verify.mjs` (`slice4`, `hardening`, `featureSlice`, `passwordSlice`) + `npm run check` |
| **4.1** | Network-Aware Interface | Client polling (`/api/ping`) | `src/app/api/ping/route.ts`, `src/lib/use-network-status.ts`, `src/components/exam-workspace.tsx` | `scripts/verify.mjs` (`slice6`) + `npm run check` |
| **4.2** | Server-Side PDF Report Generation | `report_verifications` (`008`) | `src/server/pdf/reports.ts`, `src/app/api/attempts/[id]/report.pdf/route.ts`, `src/app/api/exams/[id]/report.pdf/route.ts` | `scripts/verify.mjs` (`slice6`) + `npm run check` |
| **4.3** | Examination Sandbox | `attempts.is_sandbox`, `attempts_sandbox_unique_idx`, `real_attempts` view (`006`, `011`) | `src/server/services/secondary.service.ts`, `src/app/api/exams/[id]/sandbox/route.ts`, `src/components/exam-detail.tsx`, `src/components/exam-workspace.tsx` | `scripts/verify.mjs` (`slice6`) + `npm run check` |
| **4.4** | Bulk Data Import (Questions CSV/JSON, Candidates CSV) | `topics`, `questions`, `question_options`, `users`, `enrollments` | `src/server/import/questions-import.ts`, `src/server/import/candidates-import.ts`, `src/app/api/questions/import/**`, `src/app/api/exams/[id]/candidates/import/**`, `src/components/question-import-dialog.tsx`, `src/components/candidate-import-dialog.tsx` | `scripts/verify.mjs` (`slice1`, `slice2`, `slice6`, `hardening`) + `npm run check` |
| **4.5** | Question Analytics | `real_attempts`, `attempt_questions`, `answers` | `src/server/services/secondary.service.ts`, `src/app/api/exams/[id]/analytics/route.ts`, `src/components/exam-analytics-tab.tsx` | `scripts/verify.mjs` (`slice6`) + `npm run check` |
| **4.6** | Verifiable Reports (`VALID` / `SUPERSEDED` / `REVOKED`) | `report_verifications` (`008`) | `src/server/services/secondary.service.ts`, `src/app/api/verify/[code]/route.ts`, `src/app/verify/page.tsx`, `src/app/verify/[code]/page.tsx`, `src/components/verify-lookup.tsx` | `scripts/verify.mjs` (`slice6`, `lifecycleSlice` revocation check) + `npm run check` |
| **4.7** | Customizable Examination Workspace | `users.preferences` (`002`) | `src/server/ui-prefs.ts`, `src/app/api/me/preferences/route.ts`, `src/components/preferences-dialog.tsx`, `src/components/exam-workspace.tsx` | `scripts/verify.mjs` (`slice6`) + `npm run check` |
| **4.8** | Digital Scratchpad | `attempts.scratchpad` (`006`) + localStorage sketch | `src/app/api/attempts/[id]/scratchpad/route.ts`, `src/components/scratchpad-drawer.tsx` | `scripts/verify.mjs` (`slice6`) + `npm run check` |
| **5.2** | Blueprint Difficulty Balancing | None | Not implemented | Not applicable |
| **5.3** | Failure-Resilient Examinations (Innovation) | `answers.seq`, `answers.synced_late`, `attempts.recovery_window_seconds`, `incidents` (`LATE_SYNC`, `LATE_REJECTED`) | `src/lib/offline-queue.ts`, `src/server/services/sync.service.ts`, `src/app/api/attempts/[id]/sync/route.ts`, `src/app/api/attempts/[id]/discard-late/[answerId]/route.ts`, `src/components/exam-workspace.tsx` | `scripts/verify.mjs` (`slice7`) + `npm run check` |
| **5.4** | Trust and Dispute Resolution (Result Disputes) | `disputes`, `dispute_events` + `dispute_events_no_change` trigger (`016`) | `src/shared/schemas/dispute.ts`, `src/server/services/dispute.service.ts`, `src/app/api/attempts/[id]/disputes/route.ts`, `src/app/api/exams/[id]/disputes/route.ts`, `src/app/api/admin/disputes/route.ts`, `src/app/api/disputes/[id]/route.ts`, `src/components/dispute-views.tsx`, `src/components/exam-disputes-tab.tsx`, `src/components/admin-disputes.tsx` | Code inspection + `npm run check` (not yet covered in `scripts/verify.mjs`) |

## 2. Validation Map (Client / Server / Database)

| Domain | Client Validation | Server Validation (`src/shared/schemas/**` + Services) | Database Constraints (`db/migrations/001..016`) |
|---|---|---|---|
| Users and Auth | React Hook Form + Zod (`auth.ts`, `user.ts`) | Email normalization, password length, `FORMULA_PREFIX` rejection on names, self-demotion and last-admin guards (`409`), DB-backed rate limit | `UNIQUE (lower(email))`, `CHECK (role IN (...))`, `CHECK (char_length(name) BETWEEN 2 AND 60)`, `is_active NOT NULL` |
| Topics and Questions | React Hook Form + Zod (`question.ts`) | `MCQ_SINGLE` exactly 1 correct, `MCQ_MULTI >= 1` correct, `>= 2` options, `WRITTEN` 0 options, locked-question edit guard (`409`), `FORMULA_PREFIX` rejection | `UNIQUE (owner_id, lower(name))`, `CHECK (type IN (...))`, `CHECK (difficulty IN (...))`, `CHECK (default_marks > 0)`, `UNIQUE (question_id, position)` |
| Exams and Lifecycle | React Hook Form + Zod (`exam.ts`) | Publish readiness (`>= 1` question, `totalMarks > 0`, `starts_at < ends_at`, `duration <= window`, `ends_at > now()`), `editLevel()` field whitelist, `assertFresh(updatedAt)` optimistic lock | `CHECK (starts_at < ends_at)`, `CHECK (duration_minutes > 0)`, `CHECK (negative_marking BETWEEN 0 AND 1)`, `CHECK (recovery_window_seconds BETWEEN 0 AND 600)`, `DEFERRABLE UNIQUE (exam_id, position)` |
| Attempts, Sync, Grading | Zod (`attempt.ts`, `sync.ts`, `grading.ts`) | Enrollment and window check, monotonic `seq`, bounded recovery window + `+5s` skew plausibility, 0.5-step written score bounds, publish gate (`0` `NEEDS_REVIEW`) | Partial unique `attempts_real_unique_idx` and `attempts_sandbox_unique_idx`, `answers.attempt_question_id UNIQUE`, `CHECK (seq >= 0)`, `CHECK (char_length(scratchpad) <= 20000)` |
| Monitoring and Verification | Zod (`monitoring.ts`, `secondary.ts`) | Incident enum, extension `1..120` min + reason, code format check | Closed `CHECK` on incident types, `CHECK (minutes BETWEEN 1 AND 120)`, `CHECK (char_length(code) >= 12)` |
| Disputes | Zod (`dispute.ts`) | 7-day filing and escalation windows, max 5 disputes per attempt, rationale `20..2000` chars, 0.5-step optional score, state-machine action checks | `disputes_one_active_idx` partial unique index, outcome `CHECK`, `dispute_events_no_change` append-only trigger |

## 3. Access-Control Map

All protected endpoints use `authedRoute({ roles })` (`src/server/http.ts`), which returns `401` if unauthenticated (or if `is_active = false`, `session_version` mismatch, or `active_session_id` mismatch) and `403` if the caller's role is not permitted. Service-layer ownership checks return `404` when a caller requests another owner's resource so record existence is never leaked.

- **Public routes**: `/api/health`, `/api/ping`, `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`, `/api/verify/[code]`.
- **Any authenticated role**: `/api/auth/me`, `/api/auth/change-password`, `/api/me/preferences`, `/api/notifications`, `/api/notifications/read`, `/api/system-check`, `/api/disputes/[id]` (scoped to candidate, exam owner, or admin).
- **Admin only**: `/api/admin/users/**`, `/api/admin/audit`, `/api/admin/disputes`, `/api/admin/exams/[id]/close`, `/api/admin/exams/[id]/owner`.
- **Examiner only**: `/api/topics/**`, `/api/questions/**`, `/api/candidates`, `/api/exams/[id]/sandbox`, `/api/exams/[id]/publish`, `/api/exams/[id]/close`, `/api/exams/[id]/clone`, `/api/exams/[id]/questions`, `/api/exams/[id]/enrollments/**`, `/api/exams/[id]/candidates/import/**`, `/api/exams/[id]/monitor`, `/api/exams/[id]/announcements`, `/api/exams/[id]/grading`, `/api/exams/[id]/results/publish`, `/api/exams/[id]/rescore`, `/api/exams/[id]/analytics`, `/api/exams/[id]/disputes`, `/api/attempts/[id]/grade/[aqId]`, `/api/attempts/[id]/discard-late/[answerId]`, `/api/attempts/[id]/extensions`.
- **Examiner + Admin (read-only for Admin)**: `GET /api/exams`, `GET /api/exams/[id]`, `GET /api/exams/[id]/audit`, `GET /api/exams/[id]/results.csv`, `GET /api/exams/[id]/report.pdf`.
- **Candidate (plus Examiner sandbox where applicable)**: `/api/my/exams`, `/api/exams/[id]/start`, `/api/attempts/[id]/**` (own attempts only; `404` for other candidates).

## 4. Test Evidence

- **Date**: 2026-11-27
- **Base Commit Audited**: `9bb37ca` (`Merge branch 'feature/result-disputes' into dev`)

### Clean-Clone Static and Build Verification (`npm ci` + `npm run check`)

Executed in an isolated clean clone of `dev` (`9bb37ca`) on Node.js `v22.23.2` / npm `10.9.8`:

- `npm ci`: **PASS** (`added 636 packages, and audited 637 packages in 1m`, `found 0 vulnerabilities`).
- `tsc --noEmit`: **PASS** (0 errors).
- `eslint`: **PASS** (0 errors, 1 warning: `react-hooks/incompatible-library` on React Hook Form `watch()` in `src/components/question-form.tsx:61`).
- `next build`: **PASS** (Next.js 16.4.6 Turbopack compiled in 13.8s, TypeScript checked in 13.1s, 33 static/dynamic routes generated).

### Working-Tree `npm run check` Observation

- In the local working tree, `npm run check` initially failed with `TS2307` in `.next/types/validator.ts` referencing deleted routes from a previously checked-out branch (`feature/ai-result-summary`). A clean clone (or clearing `.next`) passes with 0 errors.

### Black-Box Verification Suite (`npm run verify`)

- Attempted against running `http://localhost:3000` on 2026-11-27:
  - `ok   anonymous -> 401`
  - `FAIL (exception) login examiner1@demo.test -> 409`
- **Cause**: `examiner1@demo.test` had an active browser session guarded by single-active-session enforcement (`014_single_active_session.sql`, `409 SESSION_ACTIVE`), confirming that single-session protection is active at runtime.
- **Empty-DB clean-clone migrate/seed**: Not executed because Docker Desktop was not running on the verification host, local PostgreSQL on port 5432 rejected the default `postgres` password (`28P01`), and the active `.env.local` targets a shared hosted Aiven database (`USE_FALLBACK_DB=true`) which was not modified.
- **Action needed before final release**: Sign out any open browser sessions (or wait 2 minutes) and run `npm run verify` against a freshly migrated and seeded database to record a full end-to-end pass count.

## 5. Honest Gap List

| Gap | Impact | Next Step |
|---|---|---|
| `scripts/verify.mjs` does not yet test migrations `014` (single active session), `015` (notifications), or `016` (disputes) | Regressions in those three modules are only caught by `npm run check` and manual testing | Add `singleSessionSlice()`, `notificationsSlice()`, and `disputesSlice()` to `scripts/verify.mjs`, and log out cached sessions at script exit so consecutive runs do not hit `409 SESSION_ACTIVE`. |
| `npm run verify` was blocked by an active `examiner1@demo.test` session during this audit | No fresh full-suite pass count was captured on `9bb37ca` | Close active demo browser tabs (or wait 120s) and run `npm run verify` against the target environment. |
| Empty-DB `db:migrate` + `db:seed` and Docker build were not run locally | Unverified on an empty local Postgres container during this pass | Start Docker Desktop, run `npm run db:up && npm run db:setup`, and verify `docker compose --profile full up --build`. |
| Unused starter scaffolding remains in repo (`src/app/api/ai/route.ts`, `src/lib/llm.ts`, `openai` dependency, `QA_Skill.md`, untracked `question-bank/`) | Adds minor clutter and unused AI env vars in `.env.example` | Decide whether to remove `/api/ai`, `src/lib/llm.ts`, and `QA_Skill.md` in a separate code-hygiene PR before freeze. |
| Innovation 5.2 (Blueprint difficulty balancing) not implemented | Feature unavailable | Keep documented as Not done; no hidden stub exists. |
