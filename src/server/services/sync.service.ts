import "server-only";
import { tx } from "../db";
import { Errors, assertUuid } from "../http";
import { attemptRepo, type AttemptQuestionRow } from "../repositories/attempt.repo";
import { scoreObjectiveAnswer } from "../exam/scoring";
import { finalizeIfExpiredInTx } from "./attempt.service";
import type { SessionUser } from "@/shared/schemas/auth";
import type {
  SyncBatchInput,
  SyncBatchResponse,
  SyncItemResult,
} from "@/shared/schemas/sync";
import type { GradingStatus } from "@/shared/schemas/attempt";

const GRACE_MS = 2000;
const CLOCK_SKEW_SLACK_MS = 5000;

export const syncService = {
  /**
   * Batch sync endpoint for Innovation 5.3 (Failure-Resilient Examinations).
   * Enforces fixed server deadline (never pauses timer) + bounded recovery window
   * for answers captured before the deadline while offline.
   */
  async syncBatch(
    user: SessionUser,
    attemptIdRaw: string,
    input: SyncBatchInput,
  ): Promise<SyncBatchResponse> {
    const attemptId = assertUuid(attemptIdRaw, "Attempt");
    const owned = await attemptRepo.findForCandidate(attemptId, user.id);
    if (!owned) throw Errors.notFound("Attempt not found");

    return tx(async (c) => {
      let attempt = (await attemptRepo.findByIdForUpdate(c, attemptId))!;
      const nowMs = attempt.server_now.getTime();
      const startedMs = attempt.started_at.getTime();
      const deadlineMs = attempt.deadline_at.getTime();
      const allowedDurationMs = Math.max(0, deadlineMs - startedMs);
      const realElapsedMs = Math.max(0, nowMs - startedMs);
      const recoveryCutoffMs =
        deadlineMs + attempt.recovery_window_seconds * 1000;

      // Normal window: IN_PROGRESS and within deadline + 2s in-flight grace.
      const isNormalWindow =
        attempt.status === "IN_PROGRESS" && nowMs <= deadlineMs + GRACE_MS;

      // Late recovery window: past deadline, recovery enabled, within cutoff, and NOT manually submitted by user/examiner.
      const isLateWindow =
        !isNormalWindow &&
        attempt.recovery_window_seconds > 0 &&
        nowMs <= recoveryCutoffMs &&
        (attempt.status === "IN_PROGRESS" || attempt.submit_reason === "TIMEOUT");

      // Lazily finalize if past deadline so status is consistent.
      if (!isNormalWindow && attempt.status === "IN_PROGRESS") {
        attempt = await finalizeIfExpiredInTx(c, attempt);
      }

      const aqs = await attemptRepo.getQuestions(attemptId, c);
      const aqMap = new Map<string, AttemptQuestionRow>(
        aqs.map((q) => [q.id, q]),
      );

      const results: SyncItemResult[] = [];
      let accepted = 0;
      let acceptedLate = 0;
      let rejected = 0;
      let needsRescore = false;

      for (const item of input.items) {
        const aq = aqMap.get(item.attemptQuestionId);
        if (!aq) {
          rejected++;
          results.push({
            attemptQuestionId: item.attemptQuestionId,
            seq: item.seq,
            status: "REJECTED",
            reason: "UNKNOWN_QUESTION",
          });
          continue;
        }

        // Validate payload against snapshot.
        const validOptIds = new Set(aq.options.map((o) => o.id));
        let selected: number[] = [];
        let textAnswer: string | null = null;
        if (aq.type === "WRITTEN") {
          textAnswer = item.textAnswer ?? null;
        } else {
          selected = [...new Set(item.selectedOptionIds ?? [])];
          if (
            (aq.type === "MCQ_SINGLE" && selected.length > 1) ||
            selected.some((id) => !validOptIds.has(id))
          ) {
            rejected++;
            results.push({
              attemptQuestionId: item.attemptQuestionId,
              seq: item.seq,
              status: "REJECTED",
              reason: "INVALID_OPTION",
            });
            continue;
          }
        }

        if (!isNormalWindow && !isLateWindow) {
          rejected++;
          const reason =
            attempt.submit_reason === "USER"
              ? "ALREADY_SUBMITTED"
              : "RECOVERY_WINDOW_CLOSED";
          results.push({
            attemptQuestionId: item.attemptQuestionId,
            seq: item.seq,
            status: "REJECTED",
            reason,
          });
          if (!attempt.is_sandbox) {
            await c.query(
              `INSERT INTO incidents (attempt_id, type, details)
               VALUES ($1, 'LATE_REJECTED', $2::jsonb)`,
              [
                attemptId,
                JSON.stringify({
                  attemptQuestionId: aq.id,
                  reason,
                  capturedElapsedMs: item.capturedElapsedMs,
                }),
              ],
            );
          }
          continue;
        }

        if (isLateWindow) {
          // Strict plausibility + deadline capture checks: no extra time allowed.
          let rejectReason: string | null = null;
          if (item.capturedElapsedMs > allowedDurationMs) {
            rejectReason = "CAPTURED_AFTER_DEADLINE";
          } else if (
            item.capturedElapsedMs >
            realElapsedMs + CLOCK_SKEW_SLACK_MS
          ) {
            rejectReason = "IMPLAUSIBLE_ELAPSED_TIME";
          }
          if (rejectReason) {
            rejected++;
            results.push({
              attemptQuestionId: item.attemptQuestionId,
              seq: item.seq,
              status: "REJECTED",
              reason: rejectReason,
            });
            if (!attempt.is_sandbox) {
              await c.query(
                `INSERT INTO incidents (attempt_id, type, details)
                 VALUES ($1, 'LATE_REJECTED', $2::jsonb)`,
                [
                  attemptId,
                  JSON.stringify({
                    attemptQuestionId: aq.id,
                    reason: rejectReason,
                    capturedElapsedMs: item.capturedElapsedMs,
                    allowedDurationMs,
                    realElapsedMs,
                  }),
                ],
              );
            }
            continue;
          }
        }

        // Monotonic seq check (idempotent).
        const existing = (
          await c.query<{ seq: number }>(
            "SELECT seq FROM answers WHERE attempt_question_id = $1",
            [aq.id],
          )
        ).rows[0];
        if (existing && item.seq <= existing.seq) {
          results.push({
            attemptQuestionId: item.attemptQuestionId,
            seq: existing.seq,
            status: "STALE",
          });
          continue;
        }

        const syncedLate = isLateWindow;
        const score =
          attempt.status === "SUBMITTED" && aq.type !== "WRITTEN"
            ? scoreObjectiveAnswer({
                type: aq.type,
                marks: aq.marks,
                options: aq.options,
                selectedOptionIds: selected,
                multiScoring: attempt.multi_scoring,
                negativeMarking: Number(attempt.negative_marking),
              })
            : null;

        await c.query(
          `INSERT INTO answers (
             attempt_question_id, attempt_id, selected_option_ids, text_answer,
             marked_for_review, seq, score, synced_late, saved_at
           ) VALUES ($1, $2, $3::int[], $4, $5, $6, $7, $8, now())
           ON CONFLICT (attempt_question_id) DO UPDATE SET
             selected_option_ids = EXCLUDED.selected_option_ids,
             text_answer = EXCLUDED.text_answer,
             marked_for_review = EXCLUDED.marked_for_review,
             seq = EXCLUDED.seq,
             score = CASE WHEN $9 THEN EXCLUDED.score ELSE answers.score END,
             synced_late = answers.synced_late OR EXCLUDED.synced_late,
             saved_at = now()
           WHERE answers.seq < EXCLUDED.seq`,
          [
            aq.id,
            attemptId,
            selected,
            textAnswer,
            item.markedForReview ?? false,
            item.seq,
            score,
            syncedLate,
            attempt.status === "SUBMITTED" && aq.type !== "WRITTEN",
          ],
        );

        if (syncedLate) {
          acceptedLate++;
          needsRescore = true;
          results.push({
            attemptQuestionId: item.attemptQuestionId,
            seq: item.seq,
            status: "ACCEPTED_LATE",
          });
          if (!attempt.is_sandbox) {
            await c.query(
              `INSERT INTO incidents (attempt_id, type, details)
               VALUES ($1, 'LATE_SYNC', $2::jsonb)`,
              [
                attemptId,
                JSON.stringify({
                  attemptQuestionId: aq.id,
                  capturedElapsedMs: item.capturedElapsedMs,
                  allowedDurationMs,
                }),
              ],
            );
          }
        } else {
          accepted++;
          results.push({
            attemptQuestionId: item.attemptQuestionId,
            seq: item.seq,
            status: "ACCEPTED",
          });
        }
      }

      await c.query("UPDATE attempts SET last_seen_at = now() WHERE id = $1", [
        attemptId,
      ]);

      if (needsRescore && attempt.status === "SUBMITTED") {
        await attemptRepo.recomputeTotalScore(c, attemptId);
      }

      return {
        serverNow: attempt.server_now.toISOString(),
        attemptStatus: attempt.status,
        accepted,
        acceptedLate,
        rejected,
        results,
      };
    });
  },

  /** Examiner discards a late-synced answer and recomputes the attempt score atomically. */
  async discardLateAnswer(
    user: SessionUser,
    attemptIdRaw: string,
    answerIdRaw: string,
  ) {
    if (user.role !== "EXAMINER") throw Errors.forbidden();
    const attemptId = assertUuid(attemptIdRaw, "Attempt");
    const answerId = assertUuid(answerIdRaw, "Answer");

    return tx(async (c) => {
      const attempt = await attemptRepo.findByIdForUpdate(c, attemptId);
      if (!attempt || attempt.is_sandbox) {
        throw Errors.notFound("Attempt not found");
      }
      const ex = await c.query<{ owner_id: string }>(
        "SELECT owner_id FROM exams WHERE id = $1",
        [attempt.exam_id],
      );
      if (!ex.rows[0] || ex.rows[0].owner_id !== user.id) {
        throw Errors.notFound("Attempt not found");
      }

      const ansRes = await c.query<{
        id: string;
        attempt_question_id: string;
        synced_late: boolean;
        type: string;
      }>(
        `SELECT ans.id, ans.attempt_question_id, ans.synced_late, aq.type
         FROM answers ans
         JOIN attempt_questions aq ON aq.id = ans.attempt_question_id
         WHERE ans.id = $1 AND ans.attempt_id = $2`,
        [answerId, attemptId],
      );
      const ans = ansRes.rows[0];
      if (!ans) throw Errors.notFound("Answer not found");
      if (!ans.synced_late) {
        throw Errors.conflict("Only late-synced answers can be discarded.");
      }

      // Reset to unanswered (0 for objective, null for written) and clear synced_late.
      const resetScore = ans.type === "WRITTEN" ? null : 0;
      await c.query(
        `UPDATE answers
         SET selected_option_ids = '{}',
             text_answer = NULL,
             synced_late = false,
             score = $2,
             feedback = COALESCE(feedback, '') || CASE WHEN COALESCE(feedback, '') = '' THEN '' ELSE E'\n' END || '[Late-synced answer discarded by examiner]'
         WHERE id = $1`,
        [ans.id, resetScore],
      );

      const totalScore = await attemptRepo.recomputeTotalScore(c, attemptId);
      if (ans.type === "WRITTEN" && attempt.status === "SUBMITTED") {
        const gradingStatus: GradingStatus = "NEEDS_REVIEW";
        await c.query("UPDATE attempts SET grading_status = $2 WHERE id = $1", [
          attemptId,
          gradingStatus,
        ]);
      }

      return { discarded: true, attemptId, answerId: ans.id, totalScore };
    });
  },
};
