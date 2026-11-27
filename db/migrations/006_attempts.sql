-- S3: attempts, immutable question snapshots, answers, and real_attempts view.

CREATE TABLE attempts (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id                 uuid        NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  candidate_id            uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_sandbox              boolean     NOT NULL DEFAULT false,
  seed                    integer     NOT NULL,
  status                  text        NOT NULL DEFAULT 'IN_PROGRESS'
                                      CHECK (status IN ('IN_PROGRESS', 'SUBMITTED')),
  grading_status          text        NOT NULL DEFAULT 'NOT_SUBMITTED'
                                      CHECK (grading_status IN ('NOT_SUBMITTED', 'AUTO_GRADED', 'NEEDS_REVIEW', 'GRADED')),
  started_at              timestamptz NOT NULL DEFAULT now(),
  deadline_at             timestamptz NOT NULL,
  submitted_at            timestamptz,
  submit_reason           text        CHECK (submit_reason IS NULL OR submit_reason IN ('USER', 'TIMEOUT', 'EXAMINER')),
  total_score             numeric(8,2),
  -- Snapshot of marking/recovery settings in force when the attempt started.
  multi_scoring           text        NOT NULL CHECK (multi_scoring IN ('PARTIAL', 'ALL_OR_NOTHING')),
  negative_marking        numeric(4,3) NOT NULL DEFAULT 0 CHECK (negative_marking >= 0 AND negative_marking <= 1),
  show_answers            boolean     NOT NULL DEFAULT false,
  recovery_window_seconds integer     NOT NULL DEFAULT 120 CHECK (recovery_window_seconds BETWEEN 0 AND 600),
  last_seen_at            timestamptz NOT NULL DEFAULT now(),
  scratchpad              text        NOT NULL DEFAULT '' CHECK (char_length(scratchpad) <= 20000)
);

-- One real attempt per candidate per exam (prevents duplicates under double-click or race).
CREATE UNIQUE INDEX attempts_real_unique_idx
  ON attempts (exam_id, candidate_id) WHERE NOT is_sandbox;

-- At most one active sandbox preview per examiner per exam (reset deletes it).
CREATE UNIQUE INDEX attempts_sandbox_unique_idx
  ON attempts (exam_id, candidate_id) WHERE is_sandbox;

CREATE INDEX attempts_exam_status_idx ON attempts (exam_id, status) WHERE NOT is_sandbox;
CREATE INDEX attempts_candidate_idx   ON attempts (candidate_id) WHERE NOT is_sandbox;

-- Shared view excluding sandbox attempts from every statistic, result list and report.
CREATE OR REPLACE VIEW real_attempts AS
  SELECT * FROM attempts WHERE NOT is_sandbox;

-- Immutable per-attempt question snapshot (in randomized order, with answer key stored in options jsonb).
CREATE TABLE attempt_questions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id  uuid         NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  position    integer      NOT NULL CHECK (position >= 0),
  question_id uuid         NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  type        text         NOT NULL CHECK (type IN ('MCQ_SINGLE', 'MCQ_MULTI', 'WRITTEN')),
  body        text         NOT NULL,
  marks       numeric(6,2) NOT NULL CHECK (marks > 0),
  options     jsonb        NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (attempt_id, position)
);
CREATE INDEX attempt_questions_question_idx ON attempt_questions (question_id);

-- One answer row per attempt_question. seq enforces monotonic idempotent autosave.
CREATE TABLE answers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_question_id uuid        NOT NULL UNIQUE REFERENCES attempt_questions(id) ON DELETE CASCADE,
  attempt_id          uuid        NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  selected_option_ids integer[]   NOT NULL DEFAULT '{}',
  text_answer         text        CHECK (text_answer IS NULL OR char_length(text_answer) <= 10000),
  marked_for_review   boolean     NOT NULL DEFAULT false,
  seq                 integer     NOT NULL DEFAULT 0 CHECK (seq >= 0),
  score               numeric(8,2),
  graded_by           uuid        REFERENCES users(id) ON DELETE SET NULL,
  graded_at           timestamptz,
  feedback            text        CHECK (feedback IS NULL OR char_length(feedback) <= 2000),
  synced_late         boolean     NOT NULL DEFAULT false,
  saved_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX answers_attempt_idx ON answers (attempt_id);
