-- 016: Result disputes (trust & dispute resolution).
--
-- Flow: candidate files (OPEN) -> examiner reviews (UNDER_REVIEW) -> examiner resolves with a
-- written rationale (RESOLVED + outcome) -> candidate accepts (CLOSED) or escalates once
-- (ESCALATED) -> an admin, independent of the exam, makes the final decision (CLOSED).
-- The candidate may withdraw before a resolution (WITHDRAWN).
--
-- Integrity: a dispute never edits scores itself. Mark changes go through the normal audited
-- grading path (GRADE_CHANGED carries the disputeId) and the dispute snapshots the score at
-- filing and at resolution, so before/after is always visible. Certificates issued earlier
-- already verify as SUPERSEDED once the score changes.

CREATE TABLE IF NOT EXISTS disputes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id          uuid        NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  exam_id             uuid        NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  candidate_id        uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- NULL = the dispute is about the whole result, not one question.
  attempt_question_id uuid        REFERENCES attempt_questions(id) ON DELETE CASCADE,
  category            text        NOT NULL CHECK (category IN (
                        'GRADING_ERROR', 'AMBIGUOUS_QUESTION', 'TECHNICAL_INCIDENT', 'OTHER')),
  reason              text        NOT NULL CHECK (char_length(reason) BETWEEN 20 AND 2000),
  status              text        NOT NULL DEFAULT 'OPEN' CHECK (status IN (
                        'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'ESCALATED', 'CLOSED', 'WITHDRAWN')),
  outcome             text        CHECK (outcome IS NULL OR outcome IN ('UPHELD', 'PARTIALLY_UPHELD', 'REJECTED')),
  resolution          text        CHECK (resolution IS NULL OR char_length(resolution) <= 2000),
  resolved_by         uuid        REFERENCES users(id) ON DELETE SET NULL,
  resolved_at         timestamptz,
  escalation_reason   text        CHECK (escalation_reason IS NULL OR char_length(escalation_reason) <= 2000),
  escalated_at        timestamptz,
  final_decision      text        CHECK (final_decision IS NULL OR char_length(final_decision) <= 2000),
  decided_by          uuid        REFERENCES users(id) ON DELETE SET NULL,
  decided_at          timestamptz,
  score_at_filing     numeric(8,2) NOT NULL,
  score_after         numeric(8,2),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  -- Every resolved, escalated or closed dispute carries an outcome.
  CHECK (status NOT IN ('RESOLVED', 'ESCALATED', 'CLOSED') OR outcome IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS disputes_exam_idx ON disputes (exam_id, created_at DESC);
CREATE INDEX IF NOT EXISTS disputes_attempt_idx ON disputes (attempt_id, created_at DESC);
CREATE INDEX IF NOT EXISTS disputes_escalated_idx ON disputes (escalated_at DESC) WHERE status = 'ESCALATED';
-- At most one live dispute per question (or per whole result) at a time.
CREATE UNIQUE INDEX IF NOT EXISTS disputes_one_active_idx
  ON disputes (attempt_id, COALESCE(attempt_question_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'ESCALATED');

-- Public timeline of each dispute. Append-only, like audit_log: history cannot be rewritten.
CREATE TABLE IF NOT EXISTS dispute_events (
  id         bigserial   PRIMARY KEY,
  dispute_id uuid        NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  actor_id   uuid,
  actor_name text        NOT NULL,
  actor_role text        NOT NULL,
  kind       text        NOT NULL CHECK (kind IN (
               'FILED', 'COMMENT', 'REVIEW_STARTED', 'RESOLVED', 'ACCEPTED',
               'ESCALATED', 'DECIDED', 'WITHDRAWN', 'SCORE_CHANGED')),
  message    text        NOT NULL DEFAULT '' CHECK (char_length(message) <= 2000),
  details    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dispute_events_dispute_idx ON dispute_events (dispute_id, id);

CREATE OR REPLACE FUNCTION dispute_events_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD; -- cascaded delete of the whole exam/attempt is allowed
  END IF;
  RAISE EXCEPTION 'dispute_events is append-only';
END;
$$;
DROP TRIGGER IF EXISTS dispute_events_no_change ON dispute_events;
CREATE TRIGGER dispute_events_no_change
  BEFORE UPDATE OR DELETE ON dispute_events
  FOR EACH ROW EXECUTE FUNCTION dispute_events_append_only();

-- Audit actions and notification types for disputes.
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_check CHECK (action IN (
  'EXAM_PUBLISHED', 'EXAM_CLOSED', 'EXAM_CLONED',
  'RESULTS_PUBLISHED', 'GRADE_CHANGED', 'LATE_ANSWER_DISCARDED',
  'TIME_EXTENSION_GRANTED',
  'USER_CREATED', 'ROLE_CHANGED', 'USER_ACTIVATED', 'USER_DEACTIVATED',
  'PASSWORD_CHANGED', 'PASSWORD_RESET',
  'EXAM_UPDATED', 'EXAM_QUESTIONS_CHANGED', 'EXAM_RESCORED',
  'EXAM_OWNER_REASSIGNED', 'EXAM_CANCELLED',
  'ENROLLMENT_ADDED', 'ENROLLMENT_REMOVED', 'ANNOUNCEMENT_POSTED',
  'DISPUTE_FILED', 'DISPUTE_RESOLVED', 'DISPUTE_ESCALATED', 'DISPUTE_DECIDED'
));

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'EXAM_PUBLISHED', 'EXAM_ENROLLED', 'EXAM_CLOSING_SOON',
  'RESULTS_PUBLISHED', 'EXAM_CANCELLED', 'GRADING_PENDING',
  'DISPUTE_FILED', 'DISPUTE_UPDATED', 'DISPUTE_ESCALATED'
));
