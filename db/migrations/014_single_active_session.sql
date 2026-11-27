-- 014: One active session per account.
-- active_session_id: the `sid` claim of the only cookie currently allowed for this user.
-- session_seen_at:   last time that session made a request / heartbeat. A session that has
--                    been silent longer than the idle window is stale and may be replaced.
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_session_id uuid;
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_seen_at timestamptz;
