# 02 - System Design and Data Model

## 1. Entity-Relationship Diagram (Generated from Migrations `001` through `016`)

Every table and column below matches `db/migrations/001_init.sql` through `db/migrations/016_disputes.sql`. The starter `items` table created in `001_init.sql` is dropped in `003_drop_items.sql` and omitted. The view `real_attempts` is defined as `SELECT * FROM attempts WHERE NOT is_sandbox` (refreshed in `011_refresh_real_attempts_view.sql`).

```mermaid
erDiagram
  users {
    uuid id PK
    text name
    text email
    text password_hash
    text role
    boolean is_active
    jsonb preferences
    integer session_version
    uuid active_session_id
    timestamptz session_seen_at
    timestamptz created_at
  }

  topics {
    uuid id PK
    uuid owner_id FK
    text name
    timestamptz created_at
  }

  questions {
    uuid id PK
    uuid owner_id FK
    uuid topic_id FK
    text type
    text difficulty
    text body
    numeric default_marks
    boolean archived
    timestamptz created_at
    timestamptz updated_at
  }

  question_options {
    serial id PK
    uuid question_id FK
    text body
    boolean is_correct
    integer position
  }

  exams {
    uuid id PK
    uuid owner_id FK
    text title
    text instructions
    timestamptz starts_at
    timestamptz ends_at
    integer duration_minutes
    text status
    boolean shuffle_questions
    boolean shuffle_options
    text multi_scoring
    numeric negative_marking
    boolean show_answers
    integer recovery_window_seconds
    timestamptz results_published_at
    text close_reason
    uuid closed_by
    boolean cancelled
    timestamptz content_changed_at
    timestamptz created_at
    timestamptz updated_at
  }

  exam_questions {
    uuid exam_id PK,FK
    uuid question_id PK,FK
    integer position
    numeric marks
  }

  enrollments {
    uuid exam_id PK,FK
    uuid candidate_id PK,FK
    timestamptz enrolled_at
  }

  attempts {
    uuid id PK
    uuid exam_id FK
    uuid candidate_id FK
    boolean is_sandbox
    integer seed
    text status
    text grading_status
    timestamptz started_at
    timestamptz deadline_at
    timestamptz submitted_at
    text submit_reason
    numeric total_score
    text multi_scoring
    numeric negative_marking
    boolean show_answers
    integer recovery_window_seconds
    timestamptz last_seen_at
    text scratchpad
    text receipt_code
    integer duration_minutes
    text instructions_snapshot
  }

  attempt_questions {
    uuid id PK
    uuid attempt_id FK
    integer position
    uuid question_id FK
    text type
    text body
    numeric marks
    jsonb options
  }

  answers {
    uuid id PK
    uuid attempt_question_id FK
    uuid attempt_id FK
    int_array selected_option_ids
    text text_answer
    boolean marked_for_review
    integer seq
    numeric score
    uuid graded_by FK
    timestamptz graded_at
    text feedback
    boolean synced_late
    timestamptz saved_at
  }

  incidents {
    uuid id PK
    uuid attempt_id FK
    text type
    timestamptz occurred_at
    jsonb details
  }

  announcements {
    uuid id PK
    uuid exam_id FK
    uuid author_id FK
    text message
    timestamptz created_at
  }

  time_extensions {
    uuid id PK
    uuid attempt_id FK
    integer minutes
    text reason
    uuid granted_by FK
    timestamptz created_at
  }

  report_verifications {
    text code PK
    uuid attempt_id FK
    timestamptz issued_at
    numeric score_at_issue
    boolean revoked
  }

  exam_rescores {
    uuid id PK
    uuid exam_id FK
    uuid question_id
    int_array old_correct_ids
    int_array new_correct_ids
    text reason
    uuid rescored_by
    integer attempts_affected
    timestamptz created_at
  }

  answer_rescores {
    bigserial id PK
    uuid rescore_id FK
    uuid attempt_id FK
    uuid attempt_question_id FK
    numeric old_score
    numeric new_score
    numeric old_total_score
    numeric new_total_score
  }

  notifications {
    uuid id PK
    uuid user_id FK
    text type
    text title
    text body
    text link
    uuid exam_id FK
    text dedupe_key
    timestamptz read_at
    timestamptz created_at
  }

  disputes {
    uuid id PK
    uuid attempt_id FK
    uuid exam_id FK
    uuid candidate_id FK
    uuid attempt_question_id FK
    text category
    text reason
    text status
    text outcome
    text resolution
    uuid resolved_by FK
    timestamptz resolved_at
    text escalation_reason
    timestamptz escalated_at
    text final_decision
    uuid decided_by FK
    timestamptz decided_at
    numeric score_at_filing
    numeric score_after
    timestamptz created_at
    timestamptz updated_at
  }

  dispute_events {
    bigserial id PK
    uuid dispute_id FK
    uuid actor_id
    text actor_name
    text actor_role
    text kind
    text message
    jsonb details
    timestamptz created_at
  }

  audit_log {
    bigserial id PK
    uuid actor_id
    text actor_name
    text actor_role
    text action
    uuid exam_id
    text target_type
    text target_id
    text summary
    jsonb details
    timestamptz created_at
  }

  rate_limit_hits {
    bigserial id PK
    text key
    timestamptz created_at
  }

  users ||--o{ topics : owns
  users ||--o{ questions : owns
  users ||--o{ exams : owns
  topics ||--o{ questions : categorizes
  questions ||--|{ question_options : has
  exams ||--o{ exam_questions : includes
  questions ||--o{ exam_questions : referenced_by
  exams ||--o{ enrollments : enrolls
  users ||--o{ enrollments : candidate
  exams ||--o{ attempts : has
  users ||--o{ attempts : candidate
  attempts ||--|{ attempt_questions : snapshots
  questions ||--o{ attempt_questions : sourced_from
  attempt_questions ||--o| answers : answered_by
  attempts ||--o{ answers : contains
  attempts ||--o{ incidents : logs
  exams ||--o{ announcements : broadcasts
  users ||--o{ announcements : authors
  attempts ||--o{ time_extensions : extended_by
  attempts ||--o{ report_verifications : issues
  exams ||--o{ exam_rescores : rescored_in
  exam_rescores ||--o{ answer_rescores : records
  attempts ||--o{ answer_rescores : affected_by
  users ||--o{ notifications : receives
  exams ||--o{ notifications : triggers
  attempts ||--o{ disputes : disputed_in
  exams ||--o{ disputes : subject_of
  users ||--o{ disputes : filed_by
  disputes ||--|{ dispute_events : timeline
```

## 2. Migration Register and Database Constraints (`001` through `016`)

| Migration | Tables / Objects | Key Constraints and Rationale |
|---|---|---|
| `001`–`003` | `users` (drops starter `items`) | `CHECK (role IN ('ADMIN','EXAMINER','CANDIDATE'))`, `UNIQUE (lower(email))`, `is_active boolean`, `preferences jsonb`. |
| `004` | `topics`, `questions`, `question_options` | `UNIQUE (owner_id, lower(name))` on topics for race-free import `ON CONFLICT`; `archived` soft-delete; `ON DELETE RESTRICT` on `topic_id`; `UNIQUE (question_id, position)` on options. |
| `005` | `exams`, `exam_questions`, `enrollments` | `CHECK (starts_at < ends_at)`, `CHECK (duration_minutes > 0)`, `CHECK (negative_marking BETWEEN 0 AND 1)`, `CHECK (recovery_window_seconds BETWEEN 0 AND 600)`. Composite PK `(exam_id, question_id)` + `DEFERRABLE` unique `(exam_id, position)`. Composite PK `(exam_id, candidate_id)` on enrollments. |
| `006` | `attempts`, `attempt_questions`, `answers`, `real_attempts` view | Partial unique index `attempts_real_unique_idx` `(exam_id, candidate_id) WHERE NOT is_sandbox`; second partial unique index `WHERE is_sandbox`; `real_attempts` view excludes sandbox attempts globally; `answers.attempt_question_id UNIQUE` + monotonic `seq` for idempotent autosave. |
| `007` | `incidents`, `announcements`, `time_extensions` | Closed `CHECK` on 8 incident types; `time_extensions` enforces `minutes BETWEEN 1 AND 120` and `reason` (`3..500` chars). |
| `008` | `report_verifications` | `code` PK (`>= 12` chars), `score_at_issue` compared against live `attempts.total_score` to detect `SUPERSEDED` reports; `revoked` flag for cancelled exams. |
| `009` | `users.session_version`, `rate_limit_hits` | Server-side session revocation (`ADM-108`) and PostgreSQL-backed sliding-window rate limiting (`ADV-131`). |
| `010`–`011` | `attempts.receipt_code`, `audit_log`, refreshed `real_attempts` | Unique `NP-XXXX-XXXX` confirmation codes; append-only `audit_log` enforced by `BEFORE UPDATE OR DELETE` trigger (`audit_log_no_change`). |
| `012` | `exams` lifecycle columns, `attempts` snapshot columns, `exam_rescores`, `answer_rescores` | Adds `close_reason`, `closed_by`, `cancelled`, `content_changed_at` on `exams`; snapshots `duration_minutes` and `instructions_snapshot` on `attempts`; stores audited MCQ rescore history. |
| `013` | `audit_log` action check | Adds `PASSWORD_CHANGED` and `PASSWORD_RESET` to `audit_log_action_check`. |
| `014` | `users.active_session_id`, `users.session_seen_at` | Enforces one active session per account (`SESSION_IDLE_SECONDS = 120`). |
| `015` | `notifications` | `UNIQUE (user_id, dedupe_key)` guarantees idempotent event and lazy time-based notifications; partial index on unread rows. |
| `016` | `disputes`, `dispute_events` | Partial unique index `disputes_one_active_idx` limits one live dispute per question (or whole result); `CHECK` requires outcome for resolved/escalated/closed; append-only trigger `dispute_events_no_change`; extends `audit_log` and `notifications` constraints. |

## 3. Key Flow Sequence Diagrams

### 3.1 Start Attempt and Immutable Snapshot

```mermaid
sequenceDiagram
  participant C as Candidate Browser
  participant API as POST /api/exams/[id]/start
  participant SVC as attemptService.start
  participant DB as PostgreSQL

  C->>API: Start exam (sid cookie)
  API->>SVC: authedRoute (CANDIDATE)
  SVC->>DB: BEGIN transaction
  SVC->>DB: Verify enrollment, status=PUBLISHED, not cancelled, now() in [starts_at, ends_at]
  SVC->>DB: INSERT INTO attempts (...) ON CONFLICT (exam_id, candidate_id) WHERE NOT is_sandbox DO NOTHING
  alt Existing active attempt
    SVC->>DB: SELECT attempt FOR UPDATE + finalizeIfExpiredInTx
    SVC-->>C: Resume existing attempt (409 if already SUBMITTED)
  else New attempt created
    SVC->>DB: Snapshot exam_questions + question_options into attempt_questions (Mulberry32 shuffle by seed)
    SVC->>DB: COMMIT
    SVC-->>C: Attempt payload (isCorrect stripped) + serverNow + deadlineAt
  end
```

### 3.2 Offline Autosave and Bounded Sync (Innovation 5.3)

```mermaid
sequenceDiagram
  participant C as Candidate Browser
  participant IDB as IndexedDB Queue
  participant API as POST /api/attempts/[id]/sync
  participant SVC as syncService.sync
  participant DB as PostgreSQL

  C->>IDB: Persist answer edit { attemptQuestionId, seq, capturedElapsedMs }
  alt Browser is offline
    IDB-->>C: UI shows Offline - Queued N (timer continues via performance.now())
  else Online or Reconnected
    C->>API: Flush queued edits batch
    API->>SVC: authedRoute (CANDIDATE)
    SVC->>DB: BEGIN + SELECT attempt FOR UPDATE
    alt Within deadline
      SVC->>DB: Upsert answers WHERE excluded.seq > answers.seq
    else Past deadline, within deadline + recovery_window_seconds
      SVC->>SVC: Check capturedElapsedMs <= allowedDurationMs and <= realElapsedMs + 5s
      alt Plausible pre-deadline capture
        SVC->>DB: Upsert answer with synced_late = true, re-score MCQ, log LATE_SYNC incident
      else Implausible or outside recovery window
        SVC->>DB: Reject edit, log LATE_REJECTED incident
      end
    end
    SVC->>DB: COMMIT
    SVC-->>C: Per-item accepted/rejected status + serverNow
    C->>IDB: Clear acknowledged edits
  end
```

### 3.3 Submit and Lazy Server-Enforced Expiry

```mermaid
sequenceDiagram
  participant C as Candidate / Examiner Poll
  participant API as Attempt or Monitor Route
  participant SVC as attemptService / finalizeIfExpiredInTx
  participant DB as PostgreSQL

  C->>API: POST /submit OR any attempt read/write / monitor poll
  API->>SVC: Enter transaction
  SVC->>DB: SELECT attempt FOR UPDATE
  alt status == SUBMITTED
    SVC-->>C: Return existing receipt_code (idempotent)
  else now() >= deadline_at OR explicit submit
    SVC->>DB: Auto-grade MCQ_SINGLE & MCQ_MULTI from attempt_questions snapshot
    SVC->>DB: Recompute total_score = GREATEST(0, SUM(score))
    SVC->>DB: Set status=SUBMITTED, grading_status=(NEEDS_REVIEW if written else AUTO_GRADED), submit_reason=(TIMEOUT or USER)
    SVC->>DB: COMMIT
    SVC-->>C: Receipt (receipt_code, submittedAt, answeredCount)
  end
```

### 3.4 Grading, Answer-Key Rescore, and Results Publish

```mermaid
sequenceDiagram
  participant E as Examiner Browser
  participant API as Grading / Publish / Rescore API
  participant SVC as gradingService / examService
  participant DB as PostgreSQL

  E->>API: PATCH /api/attempts/[id]/grade/[aqId] (score in 0.5 steps, feedback)
  API->>SVC: Verify exam owner
  SVC->>DB: BEGIN + SELECT attempt FOR UPDATE
  SVC->>DB: Update answer score/feedback + recompute total_score + update grading_status (GRADED when all written graded)
  SVC->>DB: INSERT audit_log (GRADE_CHANGED) + COMMIT
  E->>API: POST /api/exams/[id]/results/publish
  SVC->>DB: Finalize expired attempts; reject 409 if any real attempt is NEEDS_REVIEW
  SVC->>DB: SET exams.results_published_at = now() + INSERT notifications + audit_log (RESULTS_PUBLISHED)
  opt Post-publish MCQ key correction
    E->>API: POST /api/exams/[id]/rescore
    SVC->>DB: Update snapshot key, recompute affected answers & totals, log exam_rescores + answer_rescores + audit_log (EXAM_RESCORED)
  end
```

### 3.5 Public Verification and Two-Level Dispute Resolution

```mermaid
sequenceDiagram
  participant V as Verifier / Candidate
  participant E as Examiner
  participant A as Admin
  participant DB as PostgreSQL

  V->>DB: GET /api/verify/[code] (public)
  DB-->>V: Exam title, masked initials, score/band, status (VALID / SUPERSEDED / REVOKED)

  V->>DB: POST /api/attempts/[id]/disputes (within 7d of publish)
  Note over DB: status=OPEN, snapshot score_at_filing, append dispute_events (FILED), notify examiner
  E->>DB: PATCH /api/disputes/[id] (RESOLVE + rationale + optional written newScore)
  Note over DB: status=RESOLVED, optional gradeWrittenInTx + GRADE_CHANGED audit, notify candidate
  alt Candidate accepts
    V->>DB: PATCH /api/disputes/[id] (ACCEPT) -> status=CLOSED
  else Candidate escalates once (within 7d)
    V->>DB: PATCH /api/disputes/[id] (ESCALATE + reason) -> status=ESCALATED, notify admins
    A->>DB: PATCH /api/disputes/[id] (DECIDE + rationale + optional newScore) -> status=CLOSED
  end
```

## 4. Technology Selection

| Layer | Technology | Rationale |
|---|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript 5 | Unified full-stack route handlers, server components, and strict end-to-end typing. |
| Styling and UI | Tailwind CSS v4 + Radix UI primitives + Lucide icons | Accessible, composable components with zero external runtime design-system lock-in. |
| Database | PostgreSQL + `pg` (parameterized SQL) | Direct control over `FOR UPDATE` row locks, partial unique indexes, `DEFERRABLE` constraints, views, and append-only triggers without ORM abstraction leaks. |
| Validation | Zod v4 + React Hook Form | Single shared schemas in `src/shared/schemas/**` validated on both client and server. |
| Client State and Caching | TanStack Query + IndexedDB (`src/lib/offline-queue.ts`) | Declarative polling/cache invalidation plus durable offline-first answer storage. |
| Auth and Security | `jose` (HS256 JWT in HttpOnly cookie) + `bcryptjs` | Signed session tokens backed by PostgreSQL `session_version` and `active_session_id` checks on every request. |
| Reports and Charts | `jsPDF` + `qrcode` + `recharts` + `papaparse` | Pure-JS server-side PDF/QR generation (no headless Chromium needed), interactive analytics charts, and reliable CSV parsing. |

## 5. Security Architecture

- **Authentication and session integrity**: Passwords hashed with `bcryptjs` (cost 10). `sid` cookie is `HttpOnly`, `SameSite=Lax`, `Secure` in production, signed with HS256 (`SESSION_SECRET`). Every request validates `user.is_active`, `session_version`, and `active_session_id` against PostgreSQL.
- **Authorization**: Every protected route uses `authedRoute({ roles })` (`src/server/http.ts`), and every service enforces ownership (`owner_id` / `candidate_id`), returning `403` for wrong role and `404` for cross-tenant records to avoid ID enumeration.
- **Rate limiting**: PostgreSQL-backed sliding-window table `rate_limit_hits` keyed by client IP (proxy-safe: ignores `X-Forwarded-For` unless `VERCEL=1` or `TRUST_PROXY=true`) and per-email on login.
- **Injection and XSS defense**: Parameterized SQL (`$1..$n`) everywhere; React text rendering for all user content; HTTP headers `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`; CSV formula prefix rejection on import and leading-quote neutralization on export.
- **Concurrency safety**: Row-level `FOR UPDATE` locks on attempts across autosave, sync, submit, lazy expiry, grading, late-sync discard, and time extensions; `ON CONFLICT DO NOTHING` on attempt start; optimistic concurrency (`updatedAt`) on exam edits.

## 6. Decisions Log

Full rationale for all 15 architectural decisions and security fixes is maintained in [docs/DECISIONS.md](../DECISIONS.md).
