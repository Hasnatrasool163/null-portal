import { authedRoute } from "@/server/http";
import { attemptService } from "@/server/services/attempt.service";
import { saveAnswerSchema } from "@/shared/schemas/attempt";

export const PUT = authedRoute(
  { body: saveAnswerSchema },
  async ({ user, body, params }) =>
    attemptService.saveAnswer(user, params.id, body),
  ["CANDIDATE", "EXAMINER"],
);
