import { publicRoute } from "@/server/http";
import { query } from "@/server/db";
import { getProviders } from "@/lib/llm";

export const dynamic = "force-dynamic";

/** Open /api/health to check the database and which AI providers are configured. */
export const GET = publicRoute({}, async () => {
  let db = "ok";
  try {
    await query("SELECT 1");
  } catch (e) {
    db = e instanceof Error ? e.message : "error";
  }
  return { db, aiProviders: getProviders().map((p) => p.name) };
});
