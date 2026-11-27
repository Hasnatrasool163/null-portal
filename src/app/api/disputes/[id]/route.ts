import { authedRoute } from "@/server/http";
import { disputeService } from "@/server/services/dispute.service";
import { disputeActionSchema } from "@/shared/schemas/dispute";

export const GET = authedRoute({}, async ({ user, params }) =>
  disputeService.detail(user, params.id),
);

/** All state changes: { action: COMMENT | START_REVIEW | RESOLVE | ACCEPT | ESCALATE | DECIDE | WITHDRAW, ... } */
export const POST = authedRoute(
  { body: disputeActionSchema },
  async ({ user, params, body }) => disputeService.act(user, params.id, body),
);
