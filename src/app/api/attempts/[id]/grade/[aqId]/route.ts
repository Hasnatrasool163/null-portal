import { authedRoute } from "@/server/http";
import { gradingService } from "@/server/services/grading.service";
import { gradeAnswerSchema } from "@/shared/schemas/grading";

export const PUT = authedRoute(
  { body: gradeAnswerSchema },
  async ({ user, body, params }) =>
    gradingService.gradeWrittenAnswer(user, params.id, params.aqId, body),
  ["EXAMINER"],
);
