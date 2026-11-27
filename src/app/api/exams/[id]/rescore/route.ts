import { authedRoute } from "@/server/http";
import { examService } from "@/server/services/exam.service";
import { rescoreSchema } from "@/shared/schemas/exam";

/** Rescore history with old and new values (owner examiner or admin). */
export const GET = authedRoute(
  {},
  async ({ user, params }) => examService.rescoreHistory(user, params.id),
  ["EXAMINER", "ADMIN"],
);

/** Audited answer-key correction after the exam has completed (owner examiner only). */
export const POST = authedRoute(
  { body: rescoreSchema },
  async ({ user, body, params }) => examService.rescore(user, params.id, body),
  ["EXAMINER"],
);
