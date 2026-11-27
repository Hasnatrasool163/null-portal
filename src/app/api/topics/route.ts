import { authedRoute } from "@/server/http";
import { topicService } from "@/server/services/topic.service";
import { topicSchema } from "@/shared/schemas/question";

export const GET = authedRoute(
  {},
  async ({ user }) => topicService.list(user),
  ["EXAMINER"],
);

export const POST = authedRoute(
  { body: topicSchema },
  async ({ user, body }) => topicService.create(user, body.name),
  ["EXAMINER"],
);
