import { authedRoute } from "@/server/http";
import { userService } from "@/server/services/user.service";
import { createUserSchema, userListQuerySchema } from "@/shared/schemas/user";

export const GET = authedRoute(
  { query: userListQuerySchema },
  async ({ query }) => userService.list(query),
  ["ADMIN"],
);

export const POST = authedRoute(
  { body: createUserSchema },
  async ({ body, user }) => userService.create(body, user),
  ["ADMIN"],
);
