import { z } from "zod";
import { authedRoute } from "@/server/http";

const body = z.object({
  nonce: z.string().min(8).max(64),
  payload: z.string().max(20_000),
});

/**
 * Pre-exam autosave test: an authenticated JSON write that echoes back what the server
 * received. Proves the session cookie, request body and response path all work. Writes nothing.
 */
export const POST = authedRoute({ body }, async ({ body }) => ({
  nonce: body.nonce,
  receivedBytes: body.payload.length,
  serverNow: new Date().toISOString(),
}));
