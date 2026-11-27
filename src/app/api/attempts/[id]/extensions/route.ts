import { authedRoute } from "@/server/http";
import { monitoringService } from "@/server/services/monitoring.service";
import { grantExtensionSchema } from "@/shared/schemas/monitoring";

export const POST = authedRoute(
  { body: grantExtensionSchema },
  async ({ user, body, params }) =>
    monitoringService.grantExtension(user, params.id, body),
  ["EXAMINER"],
);
