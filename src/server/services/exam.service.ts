import "server-only";
import { tx } from "../db";
import { examRepo } from "../repositories/exam.repo";
import { Errors, assertUuid } from "../http";
import {
  windowErrors,
  type ExamDetail,
  type ExamPatch,
  type ExamQuestionsInput,
  type ExamSummary,
  type ExamValues,
  type Phase,
  type Readiness,
} from "@/shared/schemas/exam";
import type { SessionUser } from "@/shared/schemas/auth";

export function computeReadiness(exam: ExamSummary): Readiness {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (exam.questionCount < 1) blockers.push("Add at least 1 question.");
  if (exam.totalMarks <= 0) blockers.push("Total marks must be greater than 0.");
  const wErrs = windowErrors({
    startsAt: exam.startsAt,
    endsAt: exam.endsAt,
    durationMinutes: exam.durationMinutes,
  });
  for (const m of Object.values(wErrs)) blockers.push(m);
  if (!exam.endsInFuture) blockers.push("Exam end time is already in the past.");
  if (exam.enrollmentCount < 1) {
    warnings.push(
      "No candidates are enrolled yet. You can publish now and enroll candidates before the window ends.",
    );
  }
  return { ready: blockers.length === 0, blockers, warnings };
}

/**
 * Examiners see only their own exams; Admins have read-only oversight of all exams.
 * Missing or other examiners' exams return 404 so existence is not leaked.
 */
async function readableExam(user: SessionUser, id: string): Promise<ExamSummary> {
  const uid = assertUuid(id, "Exam");
  const ownerId = user.role === "ADMIN" ? undefined : user.id;
  const exam = await examRepo.findById(uid, ownerId);
  if (!exam) throw Errors.notFound("Exam not found");
  return exam;
}

async function ownedExam(user: SessionUser, id: string): Promise<ExamSummary> {
  if (user.role !== "EXAMINER") throw Errors.forbidden();
  const exam = await examRepo.findById(assertUuid(id, "Exam"), user.id);
  if (!exam) throw Errors.notFound("Exam not found");
  return exam;
}

export const examService = {
  list: (user: SessionUser, q: { q?: string; phase?: Phase }) =>
    examRepo.list({
      ownerId: user.role === "ADMIN" ? undefined : user.id,
      q: q.q,
      phase: q.phase,
    }),

  phaseCounts: (user: SessionUser) =>
    examRepo.phaseCounts(user.role === "ADMIN" ? undefined : user.id),

  async get(user: SessionUser, id: string): Promise<ExamDetail> {
    const exam = await readableExam(user, id);
    const questions = await examRepo.listQuestions(exam.id);
    return { ...exam, questions, readiness: computeReadiness(exam) };
  },

  async create(user: SessionUser, input: ExamValues): Promise<ExamDetail> {
    if (user.role !== "EXAMINER") throw Errors.forbidden();
    const id = await examRepo.create(user.id, input);
    return this.get(user, id);
  },

  async update(
    user: SessionUser,
    id: string,
    patch: ExamPatch,
  ): Promise<ExamDetail> {
    const existing = await ownedExam(user, id);
    if (existing.status === "DRAFT") {
      const merged: ExamValues = {
        title: patch.title ?? existing.title,
        instructions: patch.instructions ?? existing.instructions,
        startsAt: patch.startsAt ?? existing.startsAt,
        endsAt: patch.endsAt ?? existing.endsAt,
        durationMinutes: patch.durationMinutes ?? existing.durationMinutes,
        shuffleQuestions: patch.shuffleQuestions ?? existing.shuffleQuestions,
        shuffleOptions: patch.shuffleOptions ?? existing.shuffleOptions,
        multiScoring: patch.multiScoring ?? existing.multiScoring,
        negativeMarking: patch.negativeMarking ?? existing.negativeMarking,
        showAnswers: patch.showAnswers ?? existing.showAnswers,
        recoveryWindowSeconds:
          patch.recoveryWindowSeconds ?? existing.recoveryWindowSeconds,
      };
      const wErrs = windowErrors(merged);
      if (Object.keys(wErrs).length > 0) {
        throw Errors.badRequest("Please fix the exam schedule", wErrs);
      }
      await examRepo.updateDraft(existing.id, merged);
    } else {
      // After publish, only title and instructions remain editable; structural settings are locked.
      const locked = (
        [
          "startsAt",
          "endsAt",
          "durationMinutes",
          "shuffleQuestions",
          "shuffleOptions",
          "multiScoring",
          "negativeMarking",
          "showAnswers",
          "recoveryWindowSeconds",
        ] as const
      ).filter((k) => patch[k] !== undefined);
      if (locked.length > 0) {
        throw Errors.conflict(
          "Exam settings are locked after publishing. Only title and instructions can be edited.",
        );
      }
      await examRepo.updateMeta(existing.id, {
        title: patch.title ?? existing.title,
        instructions: patch.instructions ?? existing.instructions,
      });
    }
    return this.get(user, existing.id);
  },

  async setQuestions(
    user: SessionUser,
    id: string,
    input: ExamQuestionsInput,
  ): Promise<ExamDetail> {
    const existing = await ownedExam(user, id);
    if (existing.status !== "DRAFT") {
      throw Errors.conflict(
        "Questions and marks are locked once an exam is published.",
      );
    }
    const ids = input.items.map((x) => x.questionId);
    if (new Set(ids).size !== ids.length) {
      throw Errors.badRequest("Each question can only appear once in an exam.");
    }
    const ownedCount = await examRepo.countOwnedActiveQuestions(user.id, ids);
    if (ownedCount !== ids.length) {
      throw Errors.badRequest(
        "One or more selected questions are missing, archived, or not in your bank.",
      );
    }
    await tx((c) => examRepo.replaceQuestions(c, existing.id, input.items));
    return this.get(user, existing.id);
  },

  async publish(user: SessionUser, id: string): Promise<ExamDetail> {
    const existing = await ownedExam(user, id);
    if (existing.status !== "DRAFT") {
      throw Errors.conflict("Only draft exams can be published.");
    }
    const r = computeReadiness(existing);
    if (!r.ready) {
      throw Errors.conflict(r.blockers[0] ?? "Exam is not ready to publish.");
    }
    await examRepo.setStatus(existing.id, "PUBLISHED");
    return this.get(user, existing.id);
  },

  async close(user: SessionUser, id: string): Promise<ExamDetail> {
    const existing = await ownedExam(user, id);
    if (existing.status !== "PUBLISHED") {
      throw Errors.conflict("Only published exams can be closed.");
    }
    await examRepo.setStatus(existing.id, "CLOSED");
    return this.get(user, existing.id);
  },
};
