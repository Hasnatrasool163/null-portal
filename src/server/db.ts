import "server-only";
import { Pool, types, type PoolClient, type QueryResultRow } from "pg";

// Keep DATE as 'YYYY-MM-DD' strings (no timezone shifting) and numbers as numbers.
types.setTypeParser(1082, (v) => v);
types.setTypeParser(1700, (v) => parseFloat(v));
types.setTypeParser(20, (v) => parseInt(v, 10));

const g = globalThis as unknown as { __pgPool?: Pool; __pgPoolKey?: string };

/** USE_FALLBACK_DB=true prefers the hosted DATABASE_FALLBACK_URL (e.g. Aiven); otherwise DATABASE_URL. */
function resolveDbConfig(): { connectionString: string; useSsl: boolean } {
  const preferFallback = process.env.USE_FALLBACK_DB === "true";
  const raw = preferFallback
    ? process.env.DATABASE_FALLBACK_URL || process.env.DATABASE_URL
    : process.env.DATABASE_URL || process.env.DATABASE_FALLBACK_URL;

  if (!raw) {
    throw new Error(
      "DATABASE_URL (or DATABASE_FALLBACK_URL) is not set. Copy .env.example to .env.local",
    );
  }
  const url = new URL(raw);
  const sslParam = url.searchParams.get("sslmode");
  url.searchParams.delete("sslmode");

  const usingFallback = raw === process.env.DATABASE_FALLBACK_URL;
  const sslFlag = usingFallback
    ? process.env.DATABASE_FALLBACK_SSL === "true"
    : process.env.DATABASE_SSL === "true";
  const useSsl = sslFlag || sslParam === "require" || sslParam === "verify-full";

  return { connectionString: url.toString(), useSsl };
}

function createPool(): Pool {
  const { connectionString, useSsl } = resolveDbConfig();
  return new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    max: 5,
    idleTimeoutMillis: 20_000,
  });
}

// Cache survives dev hot reloads; rebuild it if the DB config changed.
export const pool = () => {
  const { connectionString, useSsl } = resolveDbConfig();
  const key = `${connectionString}|${useSsl}`;
  if (!g.__pgPool || g.__pgPoolKey !== key) {
    void g.__pgPool?.end().catch(() => { });
    g.__pgPool = createPool();
    g.__pgPoolKey = key;
  }
  return g.__pgPool;
};

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
) {
  return (await pool().query<T>(text, params)).rows;
}

/** Run several statements atomically. Rolls back if the callback throws. */
export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
