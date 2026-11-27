import { authedRoute } from "@/server/http";
import { attemptService } from "@/server/services/attempt.service";

export const POST = authedRoute(
  {},
  async ({ user, params }) => attemptService.submit(user, params.id),
  ["CANDIDATE", "EXAMINER"],
);
