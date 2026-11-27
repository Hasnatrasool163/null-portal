import "server-only";
import { tx } from "../db";
import { examRepo } from "../repositories/exam.repo";
import { enrollmentRepo } from "../repositories/enrollment.repo";
import { validateCandidateImport } from "../import/candidates-import";
import { hashPassword } from "../auth/password";
import { generateTempPassword } from "../auth/temp-password";
import { Errors, assertUuid } from "../http";
import { audit } from "../audit";
import { clearExamNotifications, notifyExamAvailable } from "../notifications";
import { editLevel } from "../exam/lifecycle";
import type { SessionUser } from "@/shared/schemas/auth";
import type { CandidateImportResult, ExamSummary } from "@/shared/schemas/exam";

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

/** New enrollments are allowed until the exam completes (draft, upcoming and ongoing). */
function assertCanEnroll(exam: ExamSummary) {
  if (editLevel(exam) === "TITLE_ONLY") {
    throw Errors.conflict(
      "Enrollment is closed: this exam has completed or been closed.",
    );
  }
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
    assertCanEnroll(exam);
    const unique = [...new Set(candidateIds)];
    const validIds = await enrollmentRepo.findActiveCandidatesByIds(unique);
    if (validIds.length !== unique.length) {
      throw Errors.badRequest(
        "One or more selected users are not active candidates.",
      );
    }
    const addedIds = await enrollmentRepo.enrollMany(exam.id, validIds);
    const added = addedIds.length;
    await notifyExamAvailable(null, exam.id, "EXAM_ENROLLED", addedIds);
    if (exam.status !== "DRAFT" && added > 0) {
      await audit(null, user, {
        action: "ENROLLMENT_ADDED",
        examId: exam.id,
        targetType: "exam",
        targetId: exam.id,
        summary: `Enrolled ${added} candidate(s) in "${exam.title}" (${exam.phase.toLowerCase()})`,
        details: { added, candidateIds: validIds },
      });
    }
    return { added, alreadyEnrolled: validIds.length - added };
  },

  async remove(user: SessionUser, examId: string, candidateId: string) {
    const exam = await ownedExam(user, examId);
    if (editLevel(exam) !== "FULL") {
      throw Errors.conflict(
        "Candidates can be added but not removed once the exam is ongoing or completed.",
      );
    }
    const cid = assertUuid(candidateId, "Candidate");
    await tx(async (c) => {
      // Lock the exam so two concurrent removals can't both pass the "last candidate" check.
      await c.query("SELECT 1 FROM exams WHERE id = $1 FOR UPDATE", [exam.id]);
      if (exam.status !== "DRAFT") {
        const r = await c.query<{ n: number; enrolled: boolean }>(
          `SELECT count(*)::int AS n, bool_or(candidate_id = $2) AS enrolled
           FROM enrollments WHERE exam_id = $1`,
          [exam.id, cid],
        );
        // Publishing requires at least one candidate; a published exam must keep that true.
        if (r.rows[0].enrolled && r.rows[0].n <= 1) {
          throw Errors.conflict(
            "A published exam must keep at least 1 candidate. Enroll someone else first, or ask an administrator to cancel the exam.",
          );
        }
      }
      await c.query("DELETE FROM enrollments WHERE exam_id = $1 AND candidate_id = $2", [exam.id, cid]);
    });
    await clearExamNotifications(null, exam.id, cid);
    if (exam.status !== "DRAFT") {
      await audit(null, user, {
        action: "ENROLLMENT_REMOVED",
        examId: exam.id,
        targetType: "user",
        targetId: cid,
        summary: `Removed a candidate from "${exam.title}"`,
        details: { candidateId: cid },
      });
    }
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
    assertCanEnroll(exam);
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
    const addedIds: string[] = [];

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
        if (added) {
          enrolled++;
          addedIds.push(candidateId);
        }
        else alreadyEnrolled++;
      }
    });

    await notifyExamAvailable(null, exam.id, "EXAM_ENROLLED", addedIds);
    if (exam.status !== "DRAFT" && enrolled > 0) {
      await audit(null, user, {
        action: "ENROLLMENT_ADDED",
        examId: exam.id,
        targetType: "exam",
        targetId: exam.id,
        summary: `Imported ${enrolled} candidate(s) into "${exam.title}" (${exam.phase.toLowerCase()})`,
        details: { added: enrolled, newAccounts: created.length },
      });
    }
    return { enrolled, alreadyEnrolled, created };
  },
};
