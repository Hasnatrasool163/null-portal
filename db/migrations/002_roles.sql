-- S0: three roles, account deactivation, per-user preferences.
-- users.role CHECK: only the three known roles can ever be stored.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
UPDATE users SET role = 'CANDIDATE' WHERE role = 'USER';
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'CANDIDATE';
ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN', 'EXAMINER', 'CANDIDATE'));

-- is_active: a deactivated user cannot log in and existing sessions stop working
-- (the user is re-read from the DB on every request).
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- preferences: candidate workspace settings (font size, theme, layout...), saved server-side.
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);
