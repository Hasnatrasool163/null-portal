import { authedRoute } from "@/server/http";
import { questionService } from "@/server/services/question.service";
import { drawRequestSchema } from "@/shared/schemas/question";

/** Pick questions at random from the caller's bank by rules (blueprint draw). Read-only. */
export const POST = authedRoute(
  { body: drawRequestSchema },
  async ({ user, body }) => questionService.draw(user, body),
  ["EXAMINER"],
);
