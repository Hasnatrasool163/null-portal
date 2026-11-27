import { authedRoute } from "@/server/http";
import { gradingService } from "@/server/services/grading.service";

export const GET = authedRoute(
  {},
  async ({ user, params }) => gradingService.getCandidateResult(user, params.id),
  ["CANDIDATE", "EXAMINER", "ADMIN"],
);
