import "server-only";
import { tx } from "../db";
import { examRepo } from "../repositories/exam.repo";
import { enrollmentRepo } from "../repositories/enrollment.repo";
import { validateCandidateImport } from "../import/candidates-import";
import { hashPassword } from "../auth/password";
import { generateTempPassword } from "../auth/temp-password";
import { Errors, assertUuid } from "../http";
import type { SessionUser } from "@/shared/schemas/auth";
import type { CandidateImportResult } from "@/shared/schemas/exam";

async function readableExam(user: SessionUser, examId: string) {
  const uid = assertUuid(examId, "Exam");
  const ownerId = user.role === "ADMIN" ? undefined : user.id;
  const exam = await examRepo.findById(uid, ownerId);
  if (!exam) throw Errors.notFound("Exam not found");
  return exam;
}

async function ownedExam(user: SessionUser, examId: string) {
  if (user.role !== "EXAMINER") throw Errors.forbidden();
  const exam = await examRepo.findById(assertUuid(examId, "Exam"), user.id);
  if (!exam) throw Errors.notFound("Exam not found");
  return exam;
}

export const enrollmentService = {
  async list(user: SessionUser, examId: string) {
    const exam = await readableExam(user, examId);
    return enrollmentRepo.list(exam.id);
  },

  async searchCandidates(q?: string, examId?: string) {
    return enrollmentRepo.searchCandidates(q, examId);
  },

  async enroll(user: SessionUser, examId: string, candidateIds: string[]) {
    const exam = await ownedExam(user, examId);
    const unique = [...new Set(candidateIds)];
    const validIds = await enrollmentRepo.findActiveCandidatesByIds(unique);
    if (validIds.length !== unique.length) {
      throw Errors.badRequest(
        "One or more selected users are not active candidates.",
      );
    }
    const added = await enrollmentRepo.enrollMany(exam.id, validIds);
    return { added, alreadyEnrolled: validIds.length - added };
  },

  async remove(user: SessionUser, examId: string, candidateId: string) {
    const exam = await ownedExam(user, examId);
    const cid = assertUuid(candidateId, "Candidate");
    await enrollmentRepo.remove(exam.id, cid);
  },

  async importValidate(user: SessionUser, examId: string, content: string) {
    await ownedExam(user, examId);
    return (await validateCandidateImport(content)).preview;
  },

  async importCommit(
    user: SessionUser,
    examId: string,
    content: string,
  ): Promise<CandidateImportResult> {
    const exam = await ownedExam(user, examId);
    const { valid } = await validateCandidateImport(content);
    if (valid.length === 0) {
      throw Errors.badRequest("No valid candidate rows to import");
    }

    // Generate & hash passwords before opening the DB transaction so we don't hold locks during bcrypt.
    const prepared = await Promise.all(
      valid.map(async (row) => {
        if (row.existingId) return { ...row, tempPassword: null, hash: null };
        const tempPassword = generateTempPassword();
        const hash = await hashPassword(tempPassword);
        return { ...row, tempPassword, hash };
      }),
    );

    const created: { name: string; email: string; tempPassword: string }[] = [];
    let enrolled = 0;
    let alreadyEnrolled = 0;

    await tx(async (c) => {
      for (const row of prepared) {
        let candidateId = row.existingId;
        if (!candidateId) {
          // Handle race where email was registered between validate and commit.
          const found = await c.query<{ id: string; role: string }>(
            "SELECT id, role FROM users WHERE lower(email) = lower($1)",
            [row.email],
          );
          if (found.rows[0]) {
            if (found.rows[0].role !== "CANDIDATE") continue;
            candidateId = found.rows[0].id;
          } else {
            const ins = await c.query<{ id: string }>(
              `INSERT INTO users (name, email, password_hash, role)
               VALUES ($1, $2, $3, 'CANDIDATE') RETURNING id`,
              [row.name, row.email, row.hash],
            );
            candidateId = ins.rows[0].id;
            created.push({
              name: row.name,
              email: row.email,
              tempPassword: row.tempPassword!,
            });
          }
        }
        const added = await enrollmentRepo.enrollInTx(c, exam.id, candidateId);
        if (added) enrolled++;
        else alreadyEnrolled++;
      }
    });

    return { enrolled, alreadyEnrolled, created };
  },
};
