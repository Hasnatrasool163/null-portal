-- 017: Cached AI quick summaries for candidate attempt results and exam analytics.
--
-- Scope separation:
-- - ATTEMPT_PUBLIC: attempt summary when answer keys are visible (show_answers = true or examiner/admin).
-- - ATTEMPT_PRIVATE: candidate attempt summary when show_answers = false (never leaks answer keys).
-- - EXAM_ANALYTICS: examiner/admin cohort-level summary for an exam's submitted attempts.
--
-- data_hash captures a fingerprint of the underlying scores/attempts so the UI can detect
-- stale summaries (e.g. after a dispute grade change or new submissions) and refresh on demand.

CREATE TABLE IF NOT EXISTS ai_result_summaries (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  scope        text        NOT NULL CHECK (scope IN ('ATTEMPT_PUBLIC', 'ATTEMPT_PRIVATE', 'EXAM_ANALYTICS')),
  attempt_id   uuid        REFERENCES attempts(id) ON DELETE CASCADE,
  exam_id      uuid        REFERENCES exams(id) ON DELETE CASCADE,
  data_hash    text        NOT NULL,
  summary      jsonb       NOT NULL,
  provider     text        NOT NULL,
  model        text        NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (scope IN ('ATTEMPT_PUBLIC', 'ATTEMPT_PRIVATE') AND attempt_id IS NOT NULL AND exam_id IS NULL)
    OR (scope = 'EXAM_ANALYTICS' AND exam_id IS NOT NULL AND attempt_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_result_summaries_attempt_scope_idx
  ON ai_result_summaries (attempt_id, scope)
  WHERE attempt_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ai_result_summaries_exam_scope_idx
  ON ai_result_summaries (exam_id, scope)
  WHERE exam_id IS NOT NULL;
