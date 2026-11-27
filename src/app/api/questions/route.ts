import { authedRoute } from "@/server/http";
import { questionService } from "@/server/services/question.service";
import {
  questionInputSchema,
  questionListQuerySchema,
} from "@/shared/schemas/question";

export const GET = authedRoute(
  { query: questionListQuerySchema },
  async ({ user, query }) => questionService.list(user, query),
  ["EXAMINER"],
);

export const POST = authedRoute(
  { body: questionInputSchema },
  async ({ user, body }) => questionService.create(user, body),
  ["EXAMINER"],
);
