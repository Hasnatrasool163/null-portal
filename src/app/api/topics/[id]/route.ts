import { authedRoute } from "@/server/http";
import { topicService } from "@/server/services/topic.service";
import { topicSchema } from "@/shared/schemas/question";

export const PATCH = authedRoute(
  { body: topicSchema },
  async ({ user, body, params }) =>
    topicService.rename(user, params.id, body.name),
  ["EXAMINER"],
);

export const DELETE = authedRoute(
  {},
  async ({ user, params }) => topicService.remove(user, params.id),
  ["EXAMINER"],
);
