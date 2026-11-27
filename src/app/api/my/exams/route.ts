import { authedRoute } from "@/server/http";
import { attemptService } from "@/server/services/attempt.service";

export const GET = authedRoute(
  {},
  async ({ user }) => attemptService.listMyExams(user),
  ["CANDIDATE"],
);
