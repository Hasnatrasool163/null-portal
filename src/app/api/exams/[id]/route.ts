import { authedRoute } from "@/server/http";
import { examService } from "@/server/services/exam.service";
import { examPatchSchema } from "@/shared/schemas/exam";

export const GET = authedRoute(
  {},
  async ({ user, params }) => examService.get(user, params.id),
  ["EXAMINER", "ADMIN"],
);

export const PATCH = authedRoute(
  { body: examPatchSchema },
  async ({ user, body, params }) => examService.update(user, params.id, body),
  ["EXAMINER"],
);
