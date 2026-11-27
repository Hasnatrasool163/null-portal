import { authedRoute, Errors } from "@/server/http";
import { userService } from "@/server/services/user.service";
import { updateUserSchema } from "@/shared/schemas/user";

export const PATCH = authedRoute(
  { body: updateUserSchema },
  async ({ user, body, params }) => {
    if (!/^[0-9a-f-]{36}$/i.test(params.id)) throw Errors.notFound("User not found");
    return userService.update(user, params.id, body);
  },
  ["ADMIN"],
);
