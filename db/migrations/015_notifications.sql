-- 015: In-app notifications.
-- dedupe_key makes every notification idempotent (e.g. one "closing soon" per exam per candidate),
-- so lazily-generated reminders can be re-checked on every read without duplicates.
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       text        NOT NULL CHECK (type IN (
               'EXAM_PUBLISHED', 'EXAM_ENROLLED', 'EXAM_CLOSING_SOON',
               'RESULTS_PUBLISHED', 'EXAM_CANCELLED', 'GRADING_PENDING')),
  title      text        NOT NULL CHECK (char_length(title) <= 200),
  body       text        NOT NULL DEFAULT '' CHECK (char_length(body) <= 1000),
  link       text,
  exam_id    uuid        REFERENCES exams(id) ON DELETE CASCADE,
  dedupe_key text        NOT NULL,
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, dedupe_key)
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON notifications (user_id) WHERE read_at IS NULL;
