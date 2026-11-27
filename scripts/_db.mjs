// Shared helper for the scripts. Loads .env.local itself (no Node flags needed).
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

export function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m || line.trim().startsWith("#")) continue;
      const v = m[2].replace(/^['"]|['"]$/g, "");
      if (process.env[m[1]] === undefined) process.env[m[1]] = v;
    }
  }
}

export function connect() {
  loadEnv();
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set (see .env.example)");
  const u = new URL(raw);
  u.searchParams.delete("sslmode");
  const ssl =
    process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: false }
      : undefined;
  return new pg.Client({ connectionString: u.toString(), ssl });
}
