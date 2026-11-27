import "server-only";
import { Pool, types, type PoolClient, type QueryResultRow } from "pg";

// Keep DATE as 'YYYY-MM-DD' strings (no timezone shifting) and numbers as numbers.
types.setTypeParser(1082, (v) => v);
types.setTypeParser(1700, (v) => parseFloat(v));
types.setTypeParser(20, (v) => parseInt(v, 10));

const g = globalThis as unknown as { __pgPool?: Pool };

function createPool(): Pool {
  const raw = process.env.DATABASE_URL;
  if (!raw)
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local");
  const url = new URL(raw);
  url.searchParams.delete("sslmode");
  return new Pool({
    connectionString: url.toString(),
    ssl:
      process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: false }
        : undefined,
    max: 5,
    idleTimeoutMillis: 20_000,
  });
}

export const pool = () => (g.__pgPool ??= createPool());

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
