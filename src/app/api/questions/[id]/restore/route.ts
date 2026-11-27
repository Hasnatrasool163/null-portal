import { authedRoute } from "@/server/http";
import { questionService } from "@/server/services/question.service";

/** Un-archive a question (owner only). Archived questions stay attached to past exams either way. */
export const POST = authedRoute(
  {},
  async ({ user, params }) => questionService.restore(user, params.id),
  ["EXAMINER"],
);
