import { authedRoute } from "@/server/http";
import { aiSummaryService } from "@/server/services/ai-summary.service";
import { aiSummaryRequestSchema } from "@/shared/schemas/ai-summary";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = authedRoute(
  {},
  async ({ user, params }) =>
    aiSummaryService.getCachedAttemptSummary(user, params.id),
  ["CANDIDATE", "EXAMINER", "ADMIN"],
);

export const POST = authedRoute(
  {
    body: aiSummaryRequestSchema,
    rateLimit: { max: 10, windowMs: 60_000 },
  },
  async ({ user, params, body }) =>
    aiSummaryService.generateAttemptSummary(
      user,
      params.id,
      body.refresh ?? false,
    ),
  ["CANDIDATE", "EXAMINER", "ADMIN"],
);
