import "server-only";
import { itemRepo } from "../repositories/item.repo";
import { Errors } from "../http";
import type { SessionUser } from "@/shared/schemas/auth";
import type {
  Item,
  ItemInput,
  ItemQuery,
  ItemUpdate,
} from "@/shared/schemas/item";

/**
 * Business rules + access control live HERE (not in routes, not in SQL).
 * Rule of thumb: a USER only ever touches their own rows; ADMIN sees everything.
 * Rows a user may not see are reported as 404 (never 403) so existence is not leaked.
 */
async function getAccessible(user: SessionUser, id: string): Promise<Item> {
  const item = await itemRepo.findById(id);
  if (!item || (user.role !== "ADMIN" && item.ownerId !== user.id))
    throw Errors.notFound("Item not found");
  return item;
}

export const itemService = {
  list: (user: SessionUser, q: ItemQuery) =>
    itemRepo.list(q, user.role === "ADMIN" ? undefined : user.id),
  get: getAccessible,
  stats: (user: SessionUser) =>
    itemRepo.countByStatus(user.role === "ADMIN" ? undefined : user.id),

  async create(user: SessionUser, input: ItemInput) {
    // Example business rule: titles are unique per owner (409 with a field-level message).
    if (await itemRepo.findByTitle(user.id, input.title)) {
      throw Errors.conflict("You already have an item with this title", {
        title: "Title already used",
      });
    }
    return itemRepo.create(user.id, input);
  },

  async update(user: SessionUser, id: string, input: ItemUpdate) {
    const existing = await getAccessible(user, id);
    if (
      input.title &&
      input.title.toLowerCase() !== existing.title.toLowerCase()
    ) {
      const clash = await itemRepo.findByTitle(existing.ownerId, input.title);
      if (clash)
        throw Errors.conflict("Another item already has this title", {
          title: "Title already used",
        });
    }
    return itemRepo.update(id, input);
  },

  async remove(user: SessionUser, id: string) {
    await getAccessible(user, id);
    await itemRepo.remove(id);
  },
};
