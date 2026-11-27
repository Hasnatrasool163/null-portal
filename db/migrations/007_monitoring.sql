-- S5: advisory incidents, live announcements, and audited time extensions.

CREATE TABLE incidents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id  uuid        NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  type        text        NOT NULL CHECK (type IN (
                'TAB_HIDDEN', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'COPY_PASTE',
                'DISCONNECT', 'RECONNECT', 'LATE_SYNC', 'LATE_REJECTED'
              )),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  details     jsonb       NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX incidents_attempt_idx ON incidents (attempt_id, occurred_at DESC);

CREATE TABLE announcements (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id    uuid        NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  author_id  uuid        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  message    text        NOT NULL CHECK (char_length(message) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX announcements_exam_idx ON announcements (exam_id, created_at DESC);

CREATE TABLE time_extensions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid        NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  minutes    integer     NOT NULL CHECK (minutes BETWEEN 1 AND 120),
  reason     text        NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 500),
  granted_by uuid        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX time_extensions_attempt_idx ON time_extensions (attempt_id, created_at DESC);
