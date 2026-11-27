import { authedRoute } from "@/server/http";
import { notificationService } from "@/server/notifications";
import { markReadSchema } from "@/shared/schemas/notification";

export const POST = authedRoute({ body: markReadSchema }, async ({ user, body }) => {
  await notificationService.markRead(user.id, body.ids);
  return null;
});
