// Applies db/migrations/*.sql in order, once each. Safe to re-run.
import fs from "node:fs";
import path from "node:path";
import { connect } from "./_db.mjs";

const dir = path.join(process.cwd(), "db", "migrations");
const client = connect();
await client.connect();
try {
  await client.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const done = new Set(
    (await client.query("SELECT name FROM schema_migrations")).rows.map(
      (r) => r.name,
    ),
  );
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const f of files) {
    if (done.has(f)) continue;
    console.log("applying", f);
    await client.query("BEGIN");
    try {
      await client.query(fs.readFileSync(path.join(dir, f), "utf8"));
      await client.query("INSERT INTO schema_migrations(name) VALUES ($1)", [
        f,
      ]);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  }
  console.log("migrations up to date");
} finally {
  await client.end();
}
