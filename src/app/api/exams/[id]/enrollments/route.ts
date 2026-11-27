import { authedRoute } from "@/server/http";
import { enrollmentService } from "@/server/services/enrollment.service";
import { enrollSchema } from "@/shared/schemas/exam";

export const GET = authedRoute(
  {},
  async ({ user, params }) => enrollmentService.list(user, params.id),
  ["EXAMINER", "ADMIN"],
);

export const POST = authedRoute(
  { body: enrollSchema },
  async ({ user, body, params }) =>
    enrollmentService.enroll(user, params.id, body.candidateIds),
  ["EXAMINER"],
);
