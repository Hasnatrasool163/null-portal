-- S6: verifiable PDF report codes.

CREATE TABLE report_verifications (
  code           text PRIMARY KEY CHECK (char_length(code) >= 12),
  attempt_id     uuid         NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  issued_at      timestamptz  NOT NULL DEFAULT now(),
  score_at_issue numeric(8,2) NOT NULL,
  revoked        boolean      NOT NULL DEFAULT false
);
CREATE INDEX report_verifications_attempt_idx ON report_verifications (attempt_id, issued_at DESC);
