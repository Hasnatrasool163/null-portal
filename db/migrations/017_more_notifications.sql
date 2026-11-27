-- 017: More notification types, and automatic dispute escalation.

-- A dispute the examiner never answered is escalated automatically after 5 days, so it reaches
-- ESCALATED without an examiner outcome. Only resolved/closed disputes must carry one.
ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_check;
ALTER TABLE disputes ADD CONSTRAINT disputes_check
  CHECK (status NOT IN ('RESOLVED', 'CLOSED') OR outcome IS NOT NULL);

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'EXAM_PUBLISHED', 'EXAM_ENROLLED', 'EXAM_CLOSING_SOON',
  'RESULTS_PUBLISHED', 'EXAM_CANCELLED', 'GRADING_PENDING',
  'DISPUTE_FILED', 'DISPUTE_UPDATED', 'DISPUTE_ESCALATED',
  -- 017
  'DISPUTE_REMINDER', 'DISPUTE_OVERDUE', 'DISPUTE_DEADLINE', 'DISPUTE_FINAL', 'DISPUTE_PATTERN',
  'SCORE_CHANGED', 'CERTIFICATE_SUPERSEDED',
  'EXAM_UPDATED', 'TIME_EXTENDED', 'ANNOUNCEMENT', 'PASSWORD_RESET', 'EXAM_REASSIGNED'
));
