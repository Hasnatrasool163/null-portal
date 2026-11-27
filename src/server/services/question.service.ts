import "server-only";
import { tx } from "../db";
import { topicRepo } from "../repositories/topic.repo";
import { questionRepo } from "../repositories/question.repo";
import { validateQuestionImport } from "../import/questions-import";
import { Errors, assertUuid } from "../http";
import type { SessionUser } from "@/shared/schemas/auth";
import type {
  ImportPayload,
  QuestionInput,
  QuestionListQuery,
} from "@/shared/schemas/question";

/**
 * Question bank rules. Every read/write is scoped to the owning examiner:
 * someone else's (or a missing) record is a 404, never a 403, so existence is not leaked.
 */
async function ownedQuestion(user: SessionUser, id: string) {
  const q = await questionRepo.findOwned(user.id, assertUuid(id, "Question"));
  if (!q) throw Errors.notFound("Question not found");
  return q;
}

async function assertOwnTopic(user: SessionUser, topicId: string) {
  if (!(await topicRepo.findOwned(user.id, topicId)))
    throw Errors.badRequest("Choose one of your topics", {
      topicId: "Unknown topic",
    });
}

export const questionService = {
  list: (user: SessionUser, q: QuestionListQuery) =>
    questionRepo
      .list(user.id, q)
      .then((r) => ({ ...r, page: q.page, pageSize: q.pageSize })),

  get: ownedQuestion,

  async create(user: SessionUser, input: QuestionInput) {
    await assertOwnTopic(user, input.topicId);
    const id = await tx((c) => questionRepo.insert(c, user.id, input));
    return ownedQuestion(user, id);
  },

  async update(user: SessionUser, id: string, input: QuestionInput) {
    const existing = await ownedQuestion(user, id);
    if (existing.locked) {
      throw Errors.conflict(
        "This question is used by a published or closed exam and cannot be edited. Use Duplicate instead.",
      );
    }
    await assertOwnTopic(user, input.topicId);
    await tx((c) => questionRepo.update(c, id, input));
    return ownedQuestion(user, id);
  },

  /** "Delete" archives: exams that already used the question keep their copy. */
  async archive(user: SessionUser, id: string) {
    await ownedQuestion(user, id);
    await questionRepo.archive(id);
  },

  async duplicate(user: SessionUser, id: string) {
    const q = await ownedQuestion(user, id);
    const newId = await tx((c) =>
      questionRepo.insert(c, user.id, {
        topicId: q.topicId,
        type: q.type,
        difficulty: q.difficulty,
        body: q.body,
        defaultMarks: q.defaultMarks,
        options: q.options.map((o) => ({
          body: o.body,
          isCorrect: o.isCorrect,
        })),
      }),
    );
    return ownedQuestion(user, newId);
  },

  /** Step 1 of import: validate only, nothing is written. */
  importValidate: (_user: SessionUser, p: ImportPayload) =>
    validateQuestionImport(p).preview,

  /** Step 2: re-validate server-side (never trust the preview) and insert valid rows atomically. */
  async importCommit(user: SessionUser, p: ImportPayload) {
    const { preview, valid } = validateQuestionImport(p);
    if (valid.length === 0)
      throw Errors.badRequest("No valid rows to import");
    await tx(async (c) => {
      const topicIds = new Map<string, string>();
      for (const row of valid) {
        const key = row.topicName.toLowerCase();
        let topicId = topicIds.get(key);
        if (!topicId) {
          topicId = await topicRepo.ensureByName(c, user.id, row.topicName);
          topicIds.set(key, topicId);
        }
        await questionRepo.insert(c, user.id, { ...row, topicId });
      }
    });
    return { imported: valid.length, skipped: preview.total - valid.length };
  },
};
