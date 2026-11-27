import { authedRoute } from "@/server/http";
import { disputeService } from "@/server/services/dispute.service";

export const GET = authedRoute(
  {},
  async ({ user, params }) => disputeService.listForExam(user, params.id),
  ["EXAMINER", "ADMIN"],
);
