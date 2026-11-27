import { authedRoute } from "@/server/http";
import { questionService } from "@/server/services/question.service";
import { questionInputSchema } from "@/shared/schemas/question";

export const GET = authedRoute(
  {},
  async ({ user, params }) => questionService.get(user, params.id),
  ["EXAMINER"],
);

export const PATCH = authedRoute(
  { body: questionInputSchema },
  async ({ user, body, params }) =>
    questionService.update(user, params.id, body),
  ["EXAMINER"],
);

export const DELETE = authedRoute(
  {},
  async ({ user, params }) => questionService.archive(user, params.id),
  ["EXAMINER"],
);
