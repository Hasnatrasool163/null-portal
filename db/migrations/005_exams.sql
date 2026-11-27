-- S2: exams, assigned questions, enrollments.

-- exams: stored status is only DRAFT/PUBLISHED/CLOSED; the displayed phase (UPCOMING/ONGOING/COMPLETED)
-- is derived at read time from DB now(), so no cron is needed.
-- CHECK starts_at < ends_at and duration > 0 stop impossible windows even if the service were bypassed;
-- negative_marking is a fraction 0..1; recovery_window_seconds is bounded (0 disables late-sync recovery).
CREATE TABLE exams (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                uuid        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title                   text        NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  instructions            text        NOT NULL DEFAULT '' CHECK (char_length(instructions) <= 4000),
  starts_at               timestamptz NOT NULL,
  ends_at                 timestamptz NOT NULL,
  duration_minutes        integer     NOT NULL CHECK (duration_minutes > 0),
  status                  text        NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED')),
  shuffle_questions       boolean     NOT NULL DEFAULT false,
  shuffle_options         boolean     NOT NULL DEFAULT false,
  multi_scoring           text        NOT NULL DEFAULT 'PARTIAL' CHECK (multi_scoring IN ('PARTIAL', 'ALL_OR_NOTHING')),
  negative_marking        numeric(4,3) NOT NULL DEFAULT 0 CHECK (negative_marking >= 0 AND negative_marking <= 1),
  show_answers            boolean     NOT NULL DEFAULT false,
  recovery_window_seconds integer     NOT NULL DEFAULT 120 CHECK (recovery_window_seconds BETWEEN 0 AND 600),
  results_published_at    timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CHECK (starts_at < ends_at)
);
CREATE INDEX exams_owner_idx ON exams (owner_id, status);
CREATE INDEX exams_window_idx ON exams (starts_at, ends_at);

-- exam_questions: composite PK = a question appears once per exam. position order is DEFERRABLE
-- so a reorder can rewrite positions inside one transaction. marks are per-exam (copied from the
-- bank's default but editable) and locked after publish by the service.
-- ON DELETE RESTRICT on question_id: a used question can only be archived, never hard-deleted.
CREATE TABLE exam_questions (
  exam_id     uuid         NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_id uuid         NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  position    integer      NOT NULL CHECK (position >= 0),
  marks       numeric(6,2) NOT NULL CHECK (marks > 0),
  PRIMARY KEY (exam_id, question_id),
  UNIQUE (exam_id, position) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX exam_questions_question_idx ON exam_questions (question_id);

-- enrollments: composite PK = one enrollment per candidate per exam (idempotent adds via ON CONFLICT).
CREATE TABLE enrollments (
  exam_id      uuid        NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  candidate_id uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (exam_id, candidate_id)
);
CREATE INDEX enrollments_candidate_idx ON enrollments (candidate_id);
