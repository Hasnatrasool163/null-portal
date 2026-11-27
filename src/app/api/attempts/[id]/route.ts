import { authedRoute } from "@/server/http";
import { attemptService } from "@/server/services/attempt.service";

export const GET = authedRoute(
  {},
  async ({ user, params }) => attemptService.getState(user, params.id),
  ["CANDIDATE", "EXAMINER"],
);
