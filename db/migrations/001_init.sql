-- Users and an example domain entity ("items").
-- RENAME/REPLACE "items" with the real entity once the theme is announced.

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  email         text        NOT NULL,
  password_hash text        NOT NULL,
  role          text        NOT NULL DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER')),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));

CREATE TABLE IF NOT EXISTS items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       text        NOT NULL CHECK (char_length(title) BETWEEN 3 AND 100),
  description text        NOT NULL DEFAULT '' CHECK (char_length(description) <= 1000),
  status      text        NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority    integer     NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  due_date    date,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS items_owner_idx  ON items (owner_id);
CREATE INDEX IF NOT EXISTS items_status_idx ON items (status);
