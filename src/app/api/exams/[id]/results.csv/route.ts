import { authedRoute } from "@/server/http";
import { gradingService } from "@/server/services/grading.service";

export const GET = authedRoute(
  {},
  async ({ user, params }) => gradingService.exportResultsCsv(user, params.id),
  ["EXAMINER", "ADMIN"],
);
