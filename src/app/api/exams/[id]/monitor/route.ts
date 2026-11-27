import { authedRoute } from "@/server/http";
import { monitoringService } from "@/server/services/monitoring.service";

export const GET = authedRoute(
  {},
  async ({ user, params }) => monitoringService.getMonitor(user, params.id),
  ["EXAMINER", "ADMIN"],
);
