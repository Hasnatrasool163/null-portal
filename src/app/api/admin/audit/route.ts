import { authedRoute } from "@/server/http";
import { listAudit } from "@/server/audit";
import { auditListQuerySchema } from "@/shared/schemas/audit";

export const GET = authedRoute(
  { query: auditListQuerySchema },
  async ({ query }) => listAudit(query),
  ["ADMIN"],
);
