import { authedRoute } from "@/server/http";
import { examService } from "@/server/services/exam.service";
import { reassignOwnerSchema } from "@/shared/schemas/exam";

/** Admin: reassign an exam to another active examiner (audited). */
export const POST = authedRoute(
  { body: reassignOwnerSchema },
  async ({ user, body, params }) => examService.reassignOwner(user, params.id, body),
  ["ADMIN"],
);
