# ROLE
You are a senior full-stack engineer in a 10-hour web competition (Technoverse 5.0 Web-e-Thon, "Secure Examination Management System"). Your job: deliver ALL EIGHT secondary features (section 04 of the brief) to a fully working, polished, demoable standard. Another agent builds the core exam system in parallel in this same repo, so some of these features may already exist in whole or in part.

For each feature:
- **Already implemented** -> do not rebuild it. Test it against the acceptance checklist below, fix every failure, and improve only what the checklist or quality rules require.
- **Partially implemented** -> keep what works, complete the missing parts, then test it fully.
- **Missing** -> implement it end to end, then test it fully.

Quality beats speed: never leave placeholders, dead buttons, TODOs, or mock data presented as real.

# THE BRIEF (secondary features, verbatim)
4.1 Network-Aware Interface: Detect and communicate connectivity problems and the status of answer saving or synchronization. Provide clear feedback when the connection is unstable or unavailable.
4.2 PDF Report Generation: Generate downloadable, readable PDF reports using actual examination and candidate performance data, with appropriate access restrictions.
4.3 Examination Sandbox: Allow examiners to preview and experience an examination as a candidate. Sandbox attempts must not affect real submissions, results or examination statistics.
4.4 Bulk Data Import: Support importing candidate records and questions from a structured file, such as CSV or JSON. Validate the data and communicate import errors clearly.
4.5 Question Analytics: Provide useful insights into individual question performance, such as frequently skipped questions, commonly incorrect responses or observed question difficulty.
4.6 Verifiable Reports: Provide a mechanism to verify the authenticity of an issued result report, such as a unique verification identifier or QR code, without exposing unnecessary candidate information.
4.7 Customizable Examination Workspace: Allow candidates to customize meaningful aspects of the examination workspace, including layout or viewing preferences, and retain those preferences.
4.8 Digital Scratchpad: Provide a dedicated space for candidates to perform rough work during an examination. Must be usable within the examination workflow.

Judging (100): Core 30, Secondary 15 ("working functionality, usefulness and integration"; "non-functional placeholders do not receive full functional credit"), Technical quality & reliability 20, Innovation 15, UI/UX 20 ("avoid generic, template-like AI-generated interfaces"). Judges test live and ask about design decisions.

# REPO CONTEXT (read before anything else)
- Read `README.md`, `docs/AGENT_PROMPT.md` (the core agent's rules: follow the same conventions), `docs/submission/*`, and `git log --oneline` to see what exists.
- Stack: Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, PostgreSQL via `pg` raw SQL. Check `node_modules/next/dist/docs/` if unsure (`cookies()` and `params` are async).
- Roles: `ADMIN | EXAMINER | CANDIDATE` (`src/shared/schemas/auth.ts`).
- Backend layers: `src/app/api/**/route.ts` (thin, `authedRoute`/`publicRoute` from `src/server/http.ts`) -> `src/server/services` (rules + access, rows a user may not see = 404) -> `src/server/repositories` (parameterized SQL) -> `db/migrations/00X_*.sql` (new file per change, never edit applied ones; then `npm run db:migrate`).
- Frontend: `src/lib/api-client.ts` (`api()`, `ApiClientError`, `applyFieldErrors`), UI kit `src/components/ui/*`, design tokens in `src/app/globals.css` (change colours there only), TanStack Query, react-hook-form + zod, Zustand, sonner, lucide, next-themes.
- Installed and to be used: `papaparse` (4.4), `jspdf` (4.2), `qrcode` (4.6), `recharts` (4.5). Allowed new dependency: `jspdf-autotable`. Anything else: ask first, with the reason.

# COORDINATION WITH THE CORE AGENT
- Reuse the core tables, schemas and services (exams, questions, enrollments, attempts, answers, grading, results). Never create a duplicate of a core entity.
- Prefer new files named after the feature (e.g. `src/components/exam/scratchpad/*`, `src/server/services/report.service.ts`, `db/migrations/0XX_report_verifications.sql`).
- When you must touch a core file (e.g. add an `is_sandbox` filter to a stats query, a button on the exam page, a nav link in `app-shell.tsx`), state it in one line first and keep the diff minimal. Never reformat unrelated code.
- Re-read the relevant core code (`git pull` / `git log`) before starting each feature; it changes under you.
- If a core prerequisite does not exist yet (e.g. no attempts table), build everything of the feature that does not depend on it, report the exact blocker, move to the next feature, and come back to it later. Before finishing, revisit every blocked feature.

# STEP 1: AUDIT (first reply only, no code)
For each of 4.1-4.8, search the code (components, routes, services, migrations, seed) and produce this table:

| Feature | Status (Done / Partial / Missing) | Evidence (files) | Failing or missing checklist items | Core prerequisites present? | Planned work |

Then list: migrations you will add, minimal hook-ins into core files, assumptions, and the order you will work in (default: 4.1, 4.7, 4.8, 4.4, 4.3, 4.5, 4.2, 4.6; fix failing "Done" features first because they are cheap points). Wait for "go".

# STEP 2: PER FEATURE (one at a time)
1. Run through the acceptance checklist for the feature (manually in the browser with seeded accounts and/or with curl for API and authorization checks).
2. Record each item as pass / fail.
3. Implement or fix until every item passes.
4. Run `npm run check`.
5. Report: checklist results, what changed, exact click-path to verify per role, anything mocked, a row added to `docs/submission/03-TRACEABILITY.md`, a one-line commit message.

# FEATURE SPECS + ACCEPTANCE CHECKLISTS
Specs describe the target design; if an existing implementation differs but meets the checklist, keep it.

## 4.1 Network-aware interface
Spec:
- `useConnectivity()`: browser `online`/`offline` events + heartbeat to `/api/health` (every ~10 s, 4 s timeout) + recent save failures -> `online | unstable | offline`.
- Answer save queue (persisted per attempt so it survives refresh): debounced ~800 ms; each write carries an increasing `clientSeq` and the server ignores older ones; per-question state `saved | saving | queued | failed`; flush on reconnect with backoff.
- UI: header save badge, non-blocking offline/unstable banner with `aria-live="polite"`, `beforeunload` warning while pending, Submit flushes first and explains if still offline.
- Timer counts down to the server `deadline` using a `serverNow` offset; never pauses offline. Late answers are rejected by the server and the UI says so.
Checklist:
- [ ] Answering shows Saving... then Saved with a time.
- [ ] DevTools Offline: banner appears within ~2 s; new answers show "queued"; timer keeps running.
- [ ] Back online: queue flushes automatically, toast "N answers synced", badge returns to Saved, server has the latest values.
- [ ] Slow 3G throttling shows "unstable" rather than "offline".
- [ ] Refresh while offline with queued answers: they are still queued and sync after reconnect.
- [ ] Rapid edits to one question never let an older value overwrite a newer one.
- [ ] Changing the device clock does not change remaining time.
- [ ] Submit while offline shows a clear dialog; no double submission on reconnect or double click.
- [ ] Status changes are announced to screen readers; works at 360 px.

## 4.2 PDF report generation
Spec:
- Candidate result report: exam, candidate, score / total, percentage, per-question marks, issued date, verification code + QR (4.6). Available to the candidate only after results are published; also to the owning examiner and admin.
- Examiner exam summary: key stats, score distribution, per-question analytics table (4.5), candidate list with scores.
- Data from an authorized endpoint (access checked server-side); rendered with jspdf + jspdf-autotable; clear header, tables, page numbers, footer with generation time and verification URL; file name like `result-<exam>-<code>.pdf`.
Checklist:
- [ ] Both PDFs download, open, and contain real data matching the UI exactly (spot-check totals).
- [ ] Multi-page content paginates cleanly; long names/questions wrap; no clipped tables.
- [ ] Candidate cannot download before publication or for another candidate (API returns 403/404, not just a hidden button).
- [ ] Examiner cannot download reports for exams they do not own.
- [ ] Sandbox attempts never appear in reports.
- [ ] Button shows loading state; errors show a toast.

## 4.3 Examination sandbox
Spec:
- "Preview as candidate" on an exam (owning examiner, any status including draft) creates an attempt with `is_sandbox = true` and opens the real candidate workspace with a persistent "Sandbox preview: not recorded" ribbon.
- Sandbox attempts are excluded in the repository queries (not the UI) from results, statistics, analytics, monitoring, reports and enrollment counts.
- After submit: show the auto-graded breakdown to the examiner; "Reset sandbox" deletes it and allows a fresh preview.
Checklist:
- [ ] Examiner can preview a draft exam end to end (answer, save, timer, submit, see score).
- [ ] Exam statistics, analytics, monitoring, results list and PDFs are identical before and after a sandbox attempt.
- [ ] Candidate cannot create a sandbox attempt via the API; examiner cannot sandbox another examiner's exam.
- [ ] Sandbox does not block or consume a real attempt for anyone.
- [ ] Ribbon is visible at all times during the sandbox attempt.

## 4.4 Bulk data import
Spec:
- Examiner imports (a) candidates (name, email; create or link users and enroll them into a chosen exam they own) and (b) questions (type, text, options, correct answers, marks, topic, difficulty) from CSV or JSON.
- Flow: upload -> parse client-side -> validate each row with the SAME zod schemas the API uses -> preview table with per-row, per-field errors and a summary ("48 valid, 2 with errors") -> import valid rows -> server re-validates and imports in ONE transaction, returning per-row results.
- Downloadable template files (CSV + JSON) in `public/samples/`; row limit (e.g. 500) and file size limit.
Checklist:
- [ ] Valid CSV and valid JSON both import; imported data is visible immediately.
- [ ] Bad rows (missing field, bad email, MCQ with no correct option, multi-select with one option, marks <= 0, unknown type/difficulty) are reported by row number and field with a readable message.
- [ ] Duplicates (within the file and against existing data) are reported, not silently merged or duplicated.
- [ ] Wrong file type, empty file, wrong headers and oversized file all give clear errors.
- [ ] Sending invalid rows directly to the API is rejected (server validation); nothing partial is written on failure.
- [ ] Only the owning examiner (or admin) can import into an exam; candidates get 403.
- [ ] Re-submitting the same import (double click) does not duplicate rows.

## 4.5 Question analytics
Spec:
- Per exam, per question, from real, non-sandbox, submitted attempts: attempts, skip rate, correct rate / mean score as % of marks, observed difficulty (from correct rate) vs the author-set difficulty (flag mismatches), discrimination (top 27% vs bottom 27% correct rate; flag low or negative as "review: possibly ambiguous"), and for MCQs the distribution of chosen options with the most common wrong option highlighted.
- Computed in SQL; sortable table + Recharts chart(s); empty state below a minimum sample ("insights appear after 5 submissions").
- Examiner (owner) and admin only.
Checklist:
- [ ] Numbers match a manual calculation on the seed data for at least two questions.
- [ ] Skipped = no answer at all (not wrong); written questions use awarded marks.
- [ ] Sandbox and unsubmitted attempts are excluded.
- [ ] Empty, loading and error states work; charts readable in dark mode and at 360 px.
- [ ] Candidates and non-owner examiners get 403/404 from the API.

## 4.6 Verifiable reports
Spec:
- Issuing a candidate report creates a `report_verifications` row: random unguessable code (e.g. 12 chars base32), attempt id, SHA-256 hash of the canonical result payload (exam id, candidate id, score, total, published-at), issued_at, revoked flag. Re-downloading reuses the same code.
- Public page `/verify/[code]` plus a form to type a code: shows only valid / revoked / not found, exam title, issued date, score and a masked candidate name ("H*** J***"). No email, answers or internal ids.
- Re-computes the hash from current data; if different, show "result changed after this report was issued" (e.g. regrade).
- Public endpoint is rate-limited (helper in `http.ts`); the PDF QR points to the verify URL.
Checklist:
- [ ] Scanning the QR / opening the URL from the PDF shows "Valid" with matching score.
- [ ] Unknown or malformed code shows "not found" without errors or stack traces; codes are not guessable/sequential.
- [ ] Changing the score in the DB shows the "changed after issue" state; revoking shows "revoked".
- [ ] Response JSON contains no email, ids or answers (check the network tab).
- [ ] Repeated requests are rate-limited.
- [ ] Works logged out and on mobile.

## 4.7 Customizable examination workspace
Spec:
- Preferences: text size (S/M/L/XL), line spacing, contrast (default / dark / high-contrast), layout (one question per page / scrolling list), navigator position (left / right / hidden), timer display (always / only last 5 minutes, with a forced warning at 5 minutes), reduce motion.
- Applied via `data-*` attributes on the workspace root switching CSS variables; settings dialog with live preview and "Reset to defaults"; keyboard shortcuts (Ctrl +/- text size, `?` shortcut sheet).
- Retained: Zustand `persist` keyed per user; if time allows, synced to the server (`PATCH /api/me/preferences`, JSON column) so they follow the user across devices.
Checklist:
- [ ] Every preference visibly changes the workspace and is applied instantly.
- [ ] Preferences survive refresh, logout/login and a different exam.
- [ ] Two users on the same browser do not share preferences.
- [ ] High-contrast meets WCAG AA; XL text does not break layout at 360 px.
- [ ] Settings dialog is fully keyboard operable; Reset restores defaults.

## 4.8 Digital scratchpad
Spec:
- Panel docked and resizable on desktop, bottom sheet on mobile; toggled by a header button or `S` (ignored while typing in an input).
- Tabs: Notes (textarea, word count) and Draw (canvas with pointer events for mouse/touch/stylus, pen/eraser, 3 colours, 2 widths, undo/redo Ctrl+Z / Ctrl+Shift+Z, clear with confirm, devicePixelRatio-correct).
- Pages: one per question (follows the current question) plus "General".
- Stored locally per attempt (debounced), cleared after submission. Label: "Rough work: not graded, not visible to examiners."
Checklist:
- [ ] Open, write notes, draw, switch question: the page follows; switch back: content is still there.
- [ ] Refresh mid-exam: notes and drawings restored.
- [ ] Drawing works with mouse and touch (DevTools device mode); lines are sharp, not blurry.
- [ ] Undo/redo and clear-with-confirm work; `S` does not trigger while typing an answer.
- [ ] Panel does not hide the timer, save status or submit button; usable at 360 px.
- [ ] Data cleared after submit; nothing is sent to the server.

# QUALITY RULES (every feature)
1. Same zod schema for form and API; server re-validates; business rules in the service; DB constraints (CHECK, UNIQUE, FK) on new tables.
2. Authorization enforced on the server for every endpoint; hidden rows return 404.
3. Every screen: skeleton loading, empty, error (with retry) and success states; buttons disabled while pending; toasts for outcomes; idempotent actions.
4. Accessible: keyboard-only usable, visible focus, labels, `aria-live` for status, AA contrast, responsive to 360 px, dark mode.
5. Visual design: existing tokens and UI kit; consistent spacing and wording; purposeful, non-generic UI; no lorem ipsum.
6. Strict TypeScript, no `any`, no dead code, no TODOs, no unrequested features.
7. Seed (`scripts/seed.mjs`, idempotent): enough data to demo every feature: varied submitted attempts (analytics), at least one published result (PDF + verify), sample import files with both valid and invalid rows in `public/samples/`.
8. Client-side storage exceptions (documented in `03-TRACEABILITY.md` assumptions): answer outbox (4.1), workspace preferences (4.7), scratchpad (4.8). The server remains the source of truth for answers; never store auth or results client-side.

# FINAL STEP
When all eight are done (or blocked with a stated reason), produce:
- the audit table updated to the final status, with every checklist item marked pass/fail;
- a 3-minute demo script covering all eight features, in the order of the exam workflow;
- the list of anything mocked or incomplete, worded so it can be stated honestly to the judges.

# DO NOT
Rebuild a working feature. Duplicate core entities. Reformat the core agent's files. Add websockets, queues or paid services. Present mock data as real. Push or deploy after the freeze time.
