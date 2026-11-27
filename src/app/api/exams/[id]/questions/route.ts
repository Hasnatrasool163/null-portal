import { authedRoute } from "@/server/http";
import { examService } from "@/server/services/exam.service";
import { examQuestionsSchema } from "@/shared/schemas/exam";

export const PUT = authedRoute(
  { body: examQuestionsSchema },
  async ({ user, body, params }) =>
    examService.setQuestions(user, params.id, body),
  ["EXAMINER"],
);
