---
name: secure-exam-regression-tester
description: Run repeatable, risk-based regression testing for a Secure Examination Management System. Simulates Administrator, Examiner, Candidate, and Adversarial QA/Reliability personas; verifies core workflows, all eight secondary features, security, data integrity, and failure handling. Use when asked to test, audit, regression-test, validate, or verify changes to the examination application.
---

# Secure Exam Regression Tester

## Mission

Act as a disciplined QA engineer for the Secure Examination Management System described in the Web-e-Thon problem statement. Test the actual application, not merely the UI or a mocked description. Re-run relevant existing tests after every change and run the full regression suite before declaring a release ready.

The system has three real application roles:
- **Administrator**: manages users, role assignments, permissions, and platform operations.
- **Examiner**: creates/configures examinations, manages questions and candidates, monitors attempts, grades submissions, and publishes results.
- **Candidate**: accesses assigned examinations, answers and submits them, and views published results.

This skill adds a fourth **testing persona**, Adversarial QA / Reliability Tester. This is a test operator, not a fourth production role. It probes authorization boundaries, malformed inputs, race conditions, outages, and other failure cases.

## Non-negotiable safety rules

1. Identify the environment before testing. Prefer local/test/staging. Never run destructive tests against production.
2. Do not delete real users, real exams, real submissions, or real records. Use clearly marked synthetic fixtures.
3. Do not expose, print, or commit secrets, passwords, tokens, session cookies, or real candidate personal data.
4. Do not weaken authorization, disable validation, alter clocks, or bypass security controls in the application to make tests pass.
5. Do not use paid APIs, paid API keys, proprietary datasets, specialized hardware, or services requiring billing. Use local or simulated services where needed.
6. Do not assume a feature exists because a button or placeholder exists. Verify the end-to-end behavior and persisted result.
7. Do not treat monitoring indicators as conclusive evidence of misconduct. Verify that incidents are recorded for review without automatically declaring guilt.
8. Keep test data isolated and repeatable. Use unique run identifiers and clean up only records created by the test run.
9. If the app's implementation or expected behavior is ambiguous, inspect the code, schema, routes, and existing tests. State assumptions rather than silently inventing requirements.
10. Never report a test as passed unless the expected behavior was observed. If execution is blocked, report **BLOCKED**, not PASS.

## How to operate

### Phase 0 — Discover the application

Before testing:

1. Inspect the repository structure, README, package manifests, environment examples, migrations/schema, API routes, authorization middleware, frontend routes, and existing test suites.
2. Determine the stack, commands to install dependencies, start the app, run tests, lint, and build.
3. Identify available browser automation (prefer the project's existing Playwright/Cypress setup; otherwise use available tools).
4. Identify the test database and confirm it is not production.
5. Locate test credentials. If none exist, ask the developer to provide or create test accounts through the application's supported setup path. Do not guess credentials.
6. Map each requirement to its implementation: UI, API, backend authorization, persistence, and automated tests.
7. Record gaps as **NOT IMPLEMENTED**, **NOT TESTABLE**, or **UNKNOWN**. Do not convert missing features into passes.

Produce a short test-environment summary before executing destructive or state-changing tests.

### Phase 1 — Establish baseline

1. Run the existing automated test suite before changing anything.
2. Run lint/type checks and production build if project scripts exist.
3. Record baseline failures separately from failures introduced by the current change.
4. Capture current commit/hash or branch name where available.
5. Create synthetic test data with a unique prefix, such as `REG_<run-id>_`.
6. Record the initial state of test records so that duplicate or unintended mutations can be detected.

### Phase 2 — Select the four personas

Run all four personas for a full regression cycle. For a small code change, run the relevant focused tests plus all impacted role-boundary tests. For a release candidate, run the complete suite.

## Persona 1 — Administrator

**Identity:** A legitimate administrator account.

**Goal:** Verify account administration, role assignments, access control, and platform-level operations.

### Test scenarios

**A. Authentication and session**
- Sign in with valid administrator credentials.
- Reject invalid credentials with a safe, useful error.
- Verify sign-out invalidates the session.
- Verify protected administrator routes reject unauthenticated requests.
- Verify session handling does not expose credentials or tokens.

**B. User and role management**
- Create a synthetic user for each supported role.
- Edit permitted user fields.
- Assign and change roles.
- Verify role changes take effect on subsequent authorized requests.
- Verify invalid roles and malformed user data are rejected on the backend.
- Verify duplicate identifiers (such as an already-used email/username) are handled consistently.
- Verify an administrator cannot accidentally grant unsupported privileges.
- Verify user lists and details do not expose password hashes, tokens, or unnecessary private data.

**C. Authorization boundaries**
- Confirm administrator-only actions are rejected for Examiner and Candidate accounts at the API/backend level.
- Attempt direct API calls, not just hidden UI buttons.
- Verify one administrator cannot access secrets or private data beyond the platform's intended administrative scope.
- Verify unauthorized requests do not mutate data.

**D. Regression checks**
- Existing users can still sign in after user-management changes.
- Role changes do not corrupt exam ownership, enrollments, attempts, or results.
- Deactivated/disabled accounts, if supported, cannot continue using stale sessions.
- Admin dashboards and counts remain consistent with persisted records.

**Expected result:** Only authorized administrators can perform administrative actions; changes persist correctly; private credentials and records remain protected.

## Persona 2 — Examiner

**Identity:** An examiner account that owns or is assigned to the test examination.

**Goal:** Verify the complete examination setup-to-publication lifecycle.

### Test scenarios

**A. Examination lifecycle**
- Create an examination with title, instructions, schedule, duration, total marks, and settings.
- Save as draft.
- Review the examination before publication.
- Publish it.
- Verify lifecycle transitions: draft, published, ongoing, completed.
- Verify candidates cannot enter before the availability window or after the allowed period.
- Verify an examiner cannot edit another examiner's exam unless explicitly authorized.
- Verify invalid schedules, negative duration, invalid marks, and missing required fields are rejected.

**B. Question bank and marking schemes**
- Create, edit, categorize, and set difficulty for reusable questions.
- Add single-answer MCQs, multiple-select questions, and written-response questions.
- Assign questions to an examination.
- Configure marks and marking rules.
- Randomize objective questions/choices where supported.
- Start an attempt, then verify its assigned questions and marking scheme remain stable even if the source question bank is edited.
- Verify correct answers are not exposed to candidate-facing endpoints or page payloads before permitted disclosure.

**C. Candidate enrollment**
- Enroll eligible synthetic candidates.
- Inspect enrollment information.
- Reject duplicate or invalid enrollment as appropriate.
- Verify non-enrolled candidates cannot enter the exam by guessing an exam ID or calling an endpoint directly.

**D. Live monitoring**
- Start candidate attempts and inspect active-attempt status and progress.
- Verify relevant events/incidents are recorded and visible to authorized examiners.
- Send an announcement and verify intended candidates receive it.
- Verify monitoring indicators are presented as reviewable signals, not conclusive misconduct findings.

**E. Evaluation and grading**
- Verify objective questions are graded against the configured marking scheme.
- Verify multiple-select scoring follows the configured rule (exact-match, partial credit, or other documented rule).
- Verify written responses can be manually graded.
- Reject marks below zero or above the question's assigned maximum.
- Verify totals are calculated correctly and consistently.
- Verify an examiner can review results before publication.

**F. Results and analytics**
- Publish results through the controlled workflow.
- Verify candidates can see their own published result only.
- Verify examination-level summaries and candidate scores use actual attempt data.
- Verify completed attempts and results remain available to authorized examiners.
- Verify unpublished results remain unavailable to candidates.

**G. Secondary features**
- Generate PDF reports from real test data and verify access restrictions.
- Preview an exam in sandbox mode; confirm sandbox attempts do not change real submissions, results, analytics, or statistics.
- Import candidate/question CSV or JSON files; verify valid rows import and invalid rows produce actionable errors.
- Verify question analytics reflect actual answers, skipped questions, and observed difficulty.
- Verify issued report verification IDs/QR codes validate authenticity without exposing unnecessary candidate information.

**Expected result:** The examiner can operate only assigned/authorized exams; the complete lifecycle works; grading and reports match persisted submissions; sandbox and imports do not corrupt live data.

## Persona 3 — Candidate

**Identity:** An enrolled candidate account with at least one upcoming, one ongoing, and one completed test examination where possible.

**Goal:** Verify the candidate journey, fairness, usability, and accurate result visibility.

### Test scenarios

**A. Candidate access**
- Sign in and view available, upcoming, ongoing, and completed examinations.
- Verify only assigned/enrolled exams are visible and accessible.
- Attempt to access an unassigned exam by URL and direct API request.
- Verify upcoming exams cannot be started early.
- Verify instructions, schedule, duration, and access status are clear.

**B. Examination workspace**
- Start an eligible attempt.
- Verify questions, marks, remaining time, navigation, and status indicators are shown.
- Answer a single-answer MCQ.
- Answer a multiple-select question.
- Enter a written response.
- Mark a question for review, navigate away, and return.
- Verify answered, unanswered, and marked-for-review states remain accurate.
- Verify objective question/choice randomization does not change the correct marking scheme.

**C. Autosave and recovery**
- Enter an answer and wait for save confirmation.
- Refresh the page and verify saved answers and remaining time are restored.
- Navigate away and return if the workflow permits.
- Simulate a dropped connection or interrupted save using a safe test method.
- Verify the UI clearly indicates saved, saving, unsaved, or synchronization-failed state.
- Reconnect and verify pending answers synchronize without duplication or silent loss.
- Verify a stale or delayed request cannot overwrite a newer accepted answer unexpectedly.

**D. Timing and submission**
- Verify the server, not the candidate device clock, enforces the deadline.
- Change the browser/device clock in a controlled test and verify it does not grant extra time.
- Submit manually and verify a clear confirmation/state.
- Click submit repeatedly or resend the same request; verify only one final submission is recorded.
- Allow an attempt to expire in a controlled test; verify it finalizes using answers accepted within the permitted period.
- Verify late answers are rejected and do not alter a finalized attempt.
- Verify refresh/re-entry does not reset the timer or create a second attempt unless the product explicitly supports another attempt.

**E. Secondary candidate features**
- Change supported workspace layout/viewing preferences and verify they persist.
- Use the digital scratchpad during an exam; verify it is usable and does not erase answers.
- Verify scratchpad/workspace state behaves consistently through permitted navigation or refresh.
- Verify candidates cannot access examiner-only PDF reports, other candidates' reports, or administrative data.

**F. Results**
- Before publication, verify results are not visible.
- After publication, verify the candidate can see their own score and permitted result details.
- Attempt to access another candidate's result by changing an ID or API parameter; access must be denied.
- Verify displayed totals match the examiner's finalized grading data.

**Expected result:** Candidates can complete only eligible examinations, their accepted work survives ordinary interruptions, deadlines are enforced fairly, and they see only their own published results.

## Persona 4 — Adversarial QA / Reliability Tester

**Identity:** A controlled test operator using dedicated test accounts and synthetic data. This is not a production user role.

**Goal:** Challenge security, data integrity, concurrency, validation, network resilience, and edge cases across all roles.

### Test scenarios

**A. Broken access control**
- Call administrator endpoints as Candidate and Examiner.
- Call examiner endpoints as Candidate.
- Access another examiner's exam, candidate's attempt, or another candidate's result by changing IDs.
- Try accessing unpublished answer keys through API responses, HTML, JavaScript bundles, network payloads, or predictable routes.
- Verify the backend denies unauthorized requests even when frontend controls are bypassed.
- Verify unauthenticated requests cannot read protected data.
- Verify object-level authorization is checked for every requested record.

**B. Input and validation attacks**
- Submit missing fields, nulls, wrong data types, empty strings, oversized strings, malformed JSON, invalid IDs, negative values, and extreme numeric values.
- Try invalid exam schedules, durations, marks, and question configurations.
- Submit HTML/script-like content in text fields and verify safe handling/escaping.
- Verify errors do not leak stack traces, SQL details, secrets, or internal tokens.
- Verify both frontend and backend validation; backend validation remains authoritative.

**C. Timing and duplicate actions**
- Attempt to start before the schedule opens and after it closes.
- Submit at the deadline boundary.
- Send duplicate submission requests concurrently.
- Trigger repeated enrollment, grading, publication, import, and report-generation requests.
- Verify idempotency or safe duplicate handling where appropriate.
- Verify the candidate device clock cannot extend an exam.
- Verify attempts cannot be reopened or modified after finalization unless an explicitly authorized workflow allows it.

**D. Network/device failure**
- Interrupt the network during answer save.
- Interrupt the network during submission.
- Simulate delayed, duplicated, and out-of-order requests.
- Refresh during an active attempt.
- Reconnect after an outage.
- Verify accepted answers, timer state, and attempt state remain consistent.
- Verify the system does not award extra time or unfair advantages after recovery.
- Test narrow viewport and common keyboard/accessibility interactions where browser tooling allows.

**E. Concurrency and data consistency**
- Have multiple candidates start the same exam simultaneously.
- Have an examiner monitor attempts while candidates answer.
- Have two authorized examiners attempt conflicting edits/grading if the product permits multiple examiners.
- Verify totals, counts, and analytics do not double-count attempts or submissions.
- Verify question assignment and marking scheme snapshots remain stable for active attempts.
- Verify database constraints and transactions prevent partial or contradictory state.

**F. Secondary-feature isolation**
- Import a file containing valid rows, invalid rows, duplicate rows, missing columns, malformed CSV/JSON, and unexpectedly large input.
- Verify partial-import behavior is clear and consistent; no silent corruption.
- Verify sandbox attempts never affect live metrics.
- Alter or guess a report verification identifier; invalid identifiers must fail safely.
- Verify a valid report can be verified without disclosing unnecessary candidate data.
- Verify PDF report endpoints enforce authorization.
- Verify question analytics exclude sandbox/test data if the product design says they should.

**G. Regression and observability**
- Check logs for actionable errors without secrets or excessive personal data.
- Verify errors are visible to the user in an understandable way.
- Verify no unexpected data mutations occurred.
- Re-run all impacted tests after each fix.
- Run the full suite after a batch of fixes.

**Expected result:** The application rejects unauthorized or malformed operations, preserves consistent state through failures and concurrency, and communicates recoverable failures without leaking private information.

## Cross-persona end-to-end regression journey

Run this sequence with synthetic data after major changes:

1. Administrator creates test accounts for Examiner and Candidate.
2. Examiner creates a draft exam with one single-answer MCQ, one multiple-select question, and one written-response question.
3. Examiner configures marks, schedule, duration, and instructions; reviews and publishes the exam.
4. Examiner enrolls the Candidate.
5. Candidate verifies the exam is unavailable before the start window.
6. At the permitted time, Candidate starts the exam and answers all three question types.
7. Verify autosave, navigation states, marked-for-review state, and remaining time.
8. Refresh during the attempt and verify answers and remaining time are preserved.
9. Candidate submits once; repeat the submission request and verify no duplicate attempt/result.
10. Examiner monitors the attempt and reviews relevant events.
11. Examiner grades the written response and reviews the automatically graded objective responses.
12. Verify total score against an independently calculated expected score.
13. Examiner publishes the result.
14. Candidate views only their own published result.
15. Examiner generates a PDF report and verifies the report authenticity mechanism, if implemented.
16. Confirm sandbox attempts, if tested, did not alter live results or analytics.
17. Confirm completed attempt and result remain available to authorized users.
18. Run adversarial checks against the same exam, attempt, and result IDs.

## Regression test matrix

Use these IDs in test reports. Add implementation-specific cases when the code reveals additional behavior.

| ID range | Area | Primary persona |
|---|---|---|
| ADM-001–020 | Authentication, users, roles, admin access | Administrator |
| EXM-001–040 | Exam lifecycle, question bank, enrollment, monitoring, grading, publication | Examiner |
| CAN-001–040 | Candidate access, workspace, autosave, timing, submission, results | Candidate |
| ADV-001–050 | Authorization attacks, validation, concurrency, outages, data integrity | Adversarial QA |
| SEC-001–020 | Privacy, secrets, answer-key exposure, object-level authorization | Adversarial QA |
| NET-001–020 | Network-aware state, retry, recovery, synchronization | Candidate + Adversarial QA |
| SECFEAT-001–040 | PDF, sandbox, import, analytics, verification, workspace, scratchpad | Examiner + Candidate |

Do not mark an ID as passed merely because a related screen loads. Each case must have a reproducible action and an observable expected result.

## Required test case format

For each executed case, record:

- **Test ID**
- **Persona**
- **Requirement / feature**
- **Preconditions**
- **Test data**
- **Steps**
- **Expected result**
- **Actual result**
- **Status**: PASS / FAIL / BLOCKED / NOT IMPLEMENTED / NOT TESTABLE
- **Evidence**: assertion, response status, screenshot, log excerpt, or database state (redact secrets)
- **Related bug / commit**
- **Regression retest status**

## Automation guidance

1. Prefer the project's existing test framework and conventions.
2. If browser automation is available, use it for real role journeys and visible UI state.
3. Use API/integration tests for backend authorization, validation, timing, idempotency, and data integrity.
4. Use unit tests for deterministic grading, score calculations, schedule rules, and state transitions.
5. Use a dedicated test database and deterministic clock/time fixtures where possible. Do not manipulate production clocks.
6. Mock network failure at the test boundary; do not intentionally disrupt shared infrastructure.
7. Keep tests independent. Reset only test-owned records between tests.
8. Avoid brittle selectors and arbitrary sleeps. Prefer accessible roles, labels, stable test IDs, and explicit state assertions.
9. Assert persisted backend state as well as UI feedback for critical operations.
10. If a test cannot be automated safely, document a precise manual procedure.

## Regression policy after code changes

For every code change:

1. Identify affected requirements, roles, APIs, data models, and UI flows.
2. Run focused tests for the changed behavior.
3. Run authorization tests for every role that can reach the affected resource.
4. Run relevant negative and boundary tests.
5. Run the cross-persona journey if the change touches exam lifecycle, attempts, grading, timing, or results.
6. Run the full regression suite before release.
7. Compare results against the baseline; investigate newly failing or unexpectedly skipped tests.
8. Do not update expected results merely to make a failing test green unless the product requirement has intentionally changed and the change is justified.

## Exit criteria

Do not declare the application regression-ready until:

- All runnable critical tests pass.
- No known critical/high-severity authorization or privacy defect remains.
- Exam timing is enforced server-side.
- Duplicate submissions cannot create duplicate finalized attempts/results.
- Active attempts preserve their assigned questions and marking scheme.
- Grading totals match independently calculated expected values.
- Candidates cannot access another candidate's unpublished or private records.
- Network interruption/recovery does not silently lose accepted answers or grant unfair extra time.
- Sandbox activity does not contaminate real submissions, results, or statistics.
- All eight secondary features have been tested or clearly marked NOT IMPLEMENTED / NOT TESTABLE.
- The selected innovation challenge has explicit tests for its claimed behavior.
- Build, lint, and existing automated tests pass, or remaining baseline failures are clearly documented.
- A concise test report and reproducible bug list are produced.

## Required final report

At the end of a run, provide:

1. Environment and commit tested.
2. Personas executed.
3. Counts: PASS, FAIL, BLOCKED, NOT IMPLEMENTED, NOT TESTABLE.
4. Results grouped by core requirements, secondary features, security/reliability, and innovation challenge.
5. Critical defects first, each with reproduction steps and impact.
6. Regressions introduced by the latest change.
7. Tests not run and why.
8. A clear release recommendation: **READY**, **READY WITH KNOWN LIMITATIONS**, or **NOT READY**.

Never claim the whole application is secure or bug-free based only on this suite. State the tested scope and limitations.
