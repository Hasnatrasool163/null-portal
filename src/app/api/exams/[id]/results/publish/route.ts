import { authedRoute } from "@/server/http";
import { gradingService } from "@/server/services/grading.service";

export const POST = authedRoute(
  {},
  async ({ user, params }) => gradingService.publishResults(user, params.id),
  ["EXAMINER"],
);
