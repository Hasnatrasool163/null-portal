import { z } from "zod";
import { authedRoute } from "@/server/http";
import { chat } from "@/lib/llm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  prompt: z.string().trim().min(1).max(8000),
  system: z.string().max(4000).optional(),
});

/** Example AI endpoint (login required, rate limited). For JSON output use structured() from @/lib/llm. */
export const POST = authedRoute(
  { body: Body, rateLimit: { max: 20, windowMs: 60_000 } },
  async ({ body }) => {
    const r = await chat(
      [
        {
          role: "system",
          content: body.system ?? "You are a concise, helpful assistant.",
        },
        { role: "user", content: body.prompt },
      ],
      { cache: true },
    );
    return { text: r.text, provider: r.provider, model: r.model };
  },
);
