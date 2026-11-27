import { authedRoute } from "@/server/http";
import { monitoringService } from "@/server/services/monitoring.service";
import { createIncidentSchema } from "@/shared/schemas/monitoring";

export const POST = authedRoute(
  { body: createIncidentSchema },
  async ({ user, body, params }) =>
    monitoringService.recordIncident(user, params.id, body),
  ["CANDIDATE", "EXAMINER"],
);
