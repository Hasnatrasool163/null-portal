import { authedRoute } from "@/server/http";
import { gradingService } from "@/server/services/grading.service";

export const GET = authedRoute(
  {},
  async ({ user, params }) => gradingService.getExamGrading(user, params.id),
  ["EXAMINER", "ADMIN"],
);
