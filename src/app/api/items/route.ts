import { authedRoute } from "@/server/http";
import { itemInput, itemQuery } from "@/shared/schemas/item";
import { itemService } from "@/server/services/item.service";

export const GET = authedRoute(
  { query: itemQuery },
  async ({ user, query }) => {
    const { items, total } = await itemService.list(user, query);
    return { items, total, page: query.page, pageSize: query.pageSize };
  },
);

export const POST = authedRoute({ body: itemInput }, async ({ user, body }) => {
  const item = await itemService.create(user, body);
  return Response.json({ ok: true, data: item }, { status: 201 });
});
