-- 009: Security hardening (ADM-108 server-side session revocation + ADV-131 DB-backed rate limiting).

-- Per-user session version: incremented on logout so any copied JWT cookie stops working immediately.
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 1;

-- Shared sliding-window rate limit table (persists across server instances and restarts).
CREATE TABLE IF NOT EXISTS rate_limit_hits (
  id         bigserial   PRIMARY KEY,
  key        text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_limit_hits_key_created_idx
  ON rate_limit_hits (key, created_at DESC);
