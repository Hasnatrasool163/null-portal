import { authedRoute } from "@/server/http";
import { secondaryService } from "@/server/services/secondary.service";

export const GET = authedRoute(
  {},
  async ({ user, params }) => secondaryService.getExamAnalytics(user, params.id),
  ["EXAMINER", "ADMIN"],
);
