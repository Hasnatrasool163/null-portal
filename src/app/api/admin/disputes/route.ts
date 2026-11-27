import { authedRoute } from "@/server/http";
import { disputeService } from "@/server/services/dispute.service";
import { disputeListQuerySchema } from "@/shared/schemas/dispute";

export const GET = authedRoute(
  { query: disputeListQuerySchema },
  async ({ user, query }) => disputeService.listAll(user, query.status),
  ["ADMIN"],
);
