import { authedRoute } from "@/server/http";
import { questionService } from "@/server/services/question.service";

export const POST = authedRoute(
  {},
  async ({ user, params }) => questionService.duplicate(user, params.id),
  ["EXAMINER"],
);
