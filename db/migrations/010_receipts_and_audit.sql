-- 010: submission receipts and an append-only audit log.

-- Receipt / confirmation code. Generated when the attempt row is created (so seeded and
-- in-flight attempts always have one) but only shown to the candidate once the attempt is SUBMITTED.
CREATE OR REPLACE FUNCTION gen_receipt_code() RETURNS text
LANGUAGE sql VOLATILE AS $$
  SELECT 'NP-' || upper(substr(h, 1, 4)) || '-' || upper(substr(h, 5, 4))
  FROM (SELECT md5(gen_random_uuid()::text) AS h) s
$$;

ALTER TABLE attempts ADD COLUMN IF NOT EXISTS receipt_code text;
UPDATE attempts SET receipt_code = gen_receipt_code() WHERE receipt_code IS NULL;
ALTER TABLE attempts ALTER COLUMN receipt_code SET DEFAULT gen_receipt_code();
ALTER TABLE attempts ALTER COLUMN receipt_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS attempts_receipt_code_idx ON attempts (receipt_code);

-- Audit log: who did what, when. Deliberately no foreign keys: the history must outlive
-- the exam or user it mentions, so actor name/role are snapshotted at write time.
CREATE TABLE IF NOT EXISTS audit_log (
  id          bigserial   PRIMARY KEY,
  actor_id    uuid,
  actor_name  text        NOT NULL,
  actor_role  text        NOT NULL,
  action      text        NOT NULL CHECK (action IN (
                'EXAM_PUBLISHED', 'EXAM_CLOSED', 'EXAM_CLONED',
                'RESULTS_PUBLISHED', 'GRADE_CHANGED', 'LATE_ANSWER_DISCARDED',
                'TIME_EXTENSION_GRANTED',
                'USER_CREATED', 'ROLE_CHANGED', 'USER_ACTIVATED', 'USER_DEACTIVATED'
              )),
  exam_id     uuid,
  target_type text        NOT NULL,
  target_id   text,
  summary     text        NOT NULL CHECK (char_length(summary) <= 500),
  details     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS audit_log_exam_idx ON audit_log (exam_id, created_at DESC) WHERE exam_id IS NOT NULL;

-- Append-only: rows can be inserted but never edited or deleted (TRUNCATE by a DB owner
-- during a full reset is the only way out, which is not reachable from the app).
CREATE OR REPLACE FUNCTION audit_log_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$;
DROP TRIGGER IF EXISTS audit_log_no_change ON audit_log;
CREATE TRIGGER audit_log_no_change
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();
