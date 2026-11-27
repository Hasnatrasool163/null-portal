import { authedRoute } from "@/server/http";
import { enrollmentService } from "@/server/services/enrollment.service";
import { candidateImportPayloadSchema } from "@/shared/schemas/exam";

export const POST = authedRoute(
  { body: candidateImportPayloadSchema },
  async ({ user, body, params }) =>
    enrollmentService.importCommit(user, params.id, body.content),
  ["EXAMINER"],
);
