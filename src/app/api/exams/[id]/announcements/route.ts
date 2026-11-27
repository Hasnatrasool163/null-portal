import { authedRoute } from "@/server/http";
import { monitoringService } from "@/server/services/monitoring.service";
import { createAnnouncementSchema } from "@/shared/schemas/monitoring";

export const GET = authedRoute(
  {},
  async ({ user, params }) =>
    monitoringService.listAnnouncements(user, params.id),
  ["EXAMINER", "ADMIN"],
);

export const POST = authedRoute(
  { body: createAnnouncementSchema },
  async ({ user, body, params }) =>
    monitoringService.postAnnouncement(user, params.id, body.message),
  ["EXAMINER"],
);
