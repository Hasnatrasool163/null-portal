import { authedRoute } from "@/server/http";
import { examService } from "@/server/services/exam.service";
import { examInputSchema, examListQuerySchema } from "@/shared/schemas/exam";

export const GET = authedRoute(
  { query: examListQuerySchema },
  async ({ user, query }) => examService.list(user, query),
  ["EXAMINER", "ADMIN"],
);

export const POST = authedRoute(
  { body: examInputSchema },
  async ({ user, body }) => examService.create(user, body),
  ["EXAMINER"],
);
