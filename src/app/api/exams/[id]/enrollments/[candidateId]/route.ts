import { authedRoute } from "@/server/http";
import { enrollmentService } from "@/server/services/enrollment.service";

export const DELETE = authedRoute(
  {},
  async ({ user, params }) =>
    enrollmentService.remove(user, params.id, params.candidateId),
  ["EXAMINER"],
);
