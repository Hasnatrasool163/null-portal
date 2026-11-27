import { authedRoute } from "@/server/http";
import { examService } from "@/server/services/exam.service";
import { adminCloseSchema } from "@/shared/schemas/exam";

/** Admin: close (published) or cancel (draft/published) an exam. Reason required and audited. */
export const POST = authedRoute(
  { body: adminCloseSchema },
  async ({ user, body, params }) => examService.adminClose(user, params.id, body),
  ["ADMIN"],
);
