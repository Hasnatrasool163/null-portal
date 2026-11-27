import { publicRoute } from "@/server/http";

export const GET = publicRoute({}, async () => ({
  ok: true,
  serverNow: new Date().toISOString(),
}));
