import { authedRoute } from "@/server/http";
import { disputeService } from "@/server/services/dispute.service";
import { createDisputeSchema } from "@/shared/schemas/dispute";

export const GET = authedRoute({}, async ({ user, params }) =>
  disputeService.listForAttempt(user, params.id),
);

export const POST = authedRoute(
  { body: createDisputeSchema },
  async ({ user, params, body }) => disputeService.create(user, params.id, body),
  ["CANDIDATE"],
);
