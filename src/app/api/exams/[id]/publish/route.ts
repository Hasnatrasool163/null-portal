import { authedRoute } from "@/server/http";
import { examService } from "@/server/services/exam.service";

export const POST = authedRoute(
  {},
  async ({ user, params }) => examService.publish(user, params.id),
  ["EXAMINER"],
);
