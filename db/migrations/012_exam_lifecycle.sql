-- 012: exam lifecycle controls (phase-based edit rules, admin close/cancel, owner reassignment,
-- audited answer-key rescoring, per-attempt snapshots of duration and instructions).

-- Exams: why/who closed or cancelled, and when candidate-visible content last changed.
ALTER TABLE exams ADD COLUMN IF NOT EXISTS close_reason       text CHECK (close_reason IS NULL OR char_length(close_reason) <= 500);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS closed_by          uuid;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS cancelled          boolean NOT NULL DEFAULT false;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS content_changed_at timestamptz;

-- Attempts: snapshot duration and instructions at start so later exam edits never alter them.
-- (deadline, scoring mode, negative marking and recovery window were already snapshotted.)
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS duration_minutes     integer CHECK (duration_minutes IS NULL OR duration_minutes > 0);
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS instructions_snapshot text;
UPDATE attempts a
   SET duration_minutes = e.duration_minutes,
       instructions_snapshot = e.instructions
  FROM exams e
 WHERE e.id = a.exam_id AND a.duration_minutes IS NULL;

-- Answer-key rescoring keeps both old and new values: one run per (exam, question) correction,
-- one row per affected answer with its old and new score.
CREATE TABLE IF NOT EXISTS exam_rescores (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id           uuid        NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_id       uuid        NOT NULL,
  old_correct_ids   integer[]   NOT NULL,
  new_correct_ids   integer[]   NOT NULL,
  reason            text        NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 500),
  rescored_by       uuid,
  attempts_affected integer     NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS exam_rescores_exam_idx ON exam_rescores (exam_id, created_at DESC);

CREATE TABLE IF NOT EXISTS answer_rescores (
  id                  bigserial PRIMARY KEY,
  rescore_id          uuid        NOT NULL REFERENCES exam_rescores(id) ON DELETE CASCADE,
  attempt_id          uuid        NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  attempt_question_id uuid        NOT NULL REFERENCES attempt_questions(id) ON DELETE CASCADE,
  old_score           numeric(8,2),
  new_score           numeric(8,2),
  old_total_score     numeric(8,2),
  new_total_score     numeric(8,2)
);
CREATE INDEX IF NOT EXISTS answer_rescores_rescore_idx ON answer_rescores (rescore_id);

-- Audit actions for post-publish changes and admin interventions.
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_check CHECK (action IN (
  'EXAM_PUBLISHED', 'EXAM_CLOSED', 'EXAM_CLONED',
  'RESULTS_PUBLISHED', 'GRADE_CHANGED', 'LATE_ANSWER_DISCARDED',
  'TIME_EXTENSION_GRANTED',
  'USER_CREATED', 'ROLE_CHANGED', 'USER_ACTIVATED', 'USER_DEACTIVATED',
  'EXAM_UPDATED', 'EXAM_QUESTIONS_CHANGED', 'EXAM_RESCORED',
  'EXAM_OWNER_REASSIGNED', 'EXAM_CANCELLED',
  'ENROLLMENT_ADDED', 'ENROLLMENT_REMOVED', 'ANNOUNCEMENT_POSTED'
));
