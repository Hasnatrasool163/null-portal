import "server-only";
import { topicRepo } from "../repositories/topic.repo";
import { Errors, assertUuid } from "../http";
import type { SessionUser } from "@/shared/schemas/auth";

async function owned(user: SessionUser, id: string) {
  const t = await topicRepo.findOwned(user.id, assertUuid(id, "Topic"));
  if (!t) throw Errors.notFound("Topic not found");
  return t;
}

async function assertNameFree(user: SessionUser, name: string, exceptId?: string) {
  const clash = await topicRepo.findByName(user.id, name);
  if (clash && clash.id !== exceptId)
    throw Errors.conflict("You already have a topic with this name", {
      name: "Topic already exists",
    });
}

export const topicService = {
  list: (user: SessionUser) => topicRepo.list(user.id),

  async create(user: SessionUser, name: string) {
    await assertNameFree(user, name);
    return topicRepo.create(user.id, name);
  },

  async rename(user: SessionUser, id: string, name: string) {
    await owned(user, id);
    await assertNameFree(user, name, id);
    await topicRepo.rename(id, name);
  },

  async remove(user: SessionUser, id: string) {
    await owned(user, id);
    if ((await topicRepo.countQuestions(id)) > 0)
      throw Errors.conflict(
        "This topic still has questions (archived ones count, because exams may use them). Rename it instead.",
      );
    await topicRepo.remove(id);
  },
};
