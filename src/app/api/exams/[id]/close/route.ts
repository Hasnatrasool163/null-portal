import { authedRoute } from "@/server/http";
import { examService } from "@/server/services/exam.service";

export const POST = authedRoute(
  {},
  async ({ user, params }) => examService.close(user, params.id),
  ["EXAMINER"],
);
