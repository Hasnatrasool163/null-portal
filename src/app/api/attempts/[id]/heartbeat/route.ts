import { authedRoute } from "@/server/http";
import { monitoringService } from "@/server/services/monitoring.service";

export const POST = authedRoute(
  {},
  async ({ user, params }) => monitoringService.heartbeat(user, params.id),
  ["CANDIDATE", "EXAMINER"],
);
