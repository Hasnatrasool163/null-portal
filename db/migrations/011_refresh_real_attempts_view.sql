-- 011: Postgres expands `SELECT *` in a view at creation time, so real_attempts (006) does not
-- see attempts.receipt_code (010). Re-create it so the new column is visible (appended at the end).
CREATE OR REPLACE VIEW real_attempts AS
  SELECT * FROM attempts WHERE NOT is_sandbox;
