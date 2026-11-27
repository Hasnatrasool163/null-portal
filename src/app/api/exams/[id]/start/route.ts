import { authedRoute } from "@/server/http";
import { attemptService } from "@/server/services/attempt.service";

export const POST = authedRoute(
  {},
  async ({ user, params }) => attemptService.startOrResume(user, params.id),
  ["CANDIDATE"],
);
