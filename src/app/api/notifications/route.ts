import { authedRoute } from "@/server/http";
import { notificationService } from "@/server/notifications";

export const GET = authedRoute({}, async ({ user }) =>
  notificationService.list(user.id),
);
