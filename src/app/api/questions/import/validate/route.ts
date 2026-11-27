import { authedRoute } from "@/server/http";
import { questionService } from "@/server/services/question.service";
import { importPayloadSchema } from "@/shared/schemas/question";

export const POST = authedRoute(
  { body: importPayloadSchema },
  async ({ user, body }) => questionService.importValidate(user, body),
  ["EXAMINER"],
);
