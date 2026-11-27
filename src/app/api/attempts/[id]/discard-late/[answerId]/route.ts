import { authedRoute } from "@/server/http";
import { syncService } from "@/server/services/sync.service";

export const POST = authedRoute(
  {},
  async ({ user, params }) =>
    syncService.discardLateAnswer(user, params.id, params.answerId),
  ["EXAMINER"],
);
