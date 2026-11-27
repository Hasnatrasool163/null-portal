import { authedRoute, Errors } from "@/server/http";
import { idSchema } from "@/shared/schemas/common";
import { itemUpdate } from "@/shared/schemas/item";
import { itemService } from "@/server/services/item.service";

const idOf = (params: Record<string, string>) => {
  const r = idSchema.safeParse(params.id);
  if (!r.success) throw Errors.notFound("Item not found"); // malformed id = not found
  return r.data;
};

export const GET = authedRoute({}, async ({ user, params }) =>
  itemService.get(user, idOf(params)),
);

export const PATCH = authedRoute(
  { body: itemUpdate },
  async ({ user, params, body }) =>
    itemService.update(user, idOf(params), body),
);

export const DELETE = authedRoute({}, async ({ user, params }) => {
  await itemService.remove(user, idOf(params));
  return null;
});
