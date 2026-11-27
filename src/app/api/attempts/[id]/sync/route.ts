import { authedRoute } from "@/server/http";
import { syncService } from "@/server/services/sync.service";
import { syncBatchSchema } from "@/shared/schemas/sync";

export const POST = authedRoute(
  { body: syncBatchSchema },
  async ({ user, body, params }) =>
    syncService.syncBatch(user, params.id, body),
  ["CANDIDATE", "EXAMINER"],
);
