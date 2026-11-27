import "server-only";
import type { PoolClient } from "pg";
import { query, tx } from "../db";
import { assertUuid, checkRateLimit, Errors } from "../http";
import { audit } from "../audit";
import { notifyUsers } from "../notifications";
import { gradeWrittenInTx } from "./grading.service";
import type { Role, SessionUser } from "@/shared/schemas/auth";
import {
  CATEGORY_LABEL,
  DISPUTE_ESCALATION_DAYS,
  DISPUTE_FILING_DAYS,
  MAX_DISPUTES_PER_ATTEMPT,
  OUTCOME_LABEL,
  type AttemptDisputes,
  type CreateDisputeInput,
  type DisputeAction,
  type DisputeActionInput,
  type DisputeCategory,
  type DisputeDetail,
  type DisputeEventKind,
  type DisputeOutcome,
  type DisputeStatus,
  type DisputeSummary,
} from "@/shared/schemas/dispute";

/*
 * Trust & dispute resolution.
 *
 * Fairness: two independent levels. The exam's examiner reviews first; the candidate may
 * escalate once to an administrator, who is not the exam owner, for a final decision.
 * Transparency: every step is an append-only timeline event the candidate can read, and every
 * resolution requires a written rationale. Accountability: who decided what is stored on the
 * dispute and in the audit log. Integrity: scores change only through the audited grading path
 * (inside the same transaction as the decision), with before/after scores recorded.
 */

const DAY_MS = 86_400_000;
const LIVE: DisputeStatus[] = ["OPEN", "UNDER_REVIEW", "RESOLVED", "ESCALATED"];

type Row = {
  id: string;
  attempt_id: string;
  exam_id: string;
  exam_title: string;
  owner_id: string;
  show_answers: boolean;
  candidate_id: string;
  candidate_name: string;
  attempt_question_id: string | null;
  question_position: number | null;
  category: DisputeCategory;
  reason: string;
  status: DisputeStatus;
  outcome: DisputeOutcome | null;
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: Date | null;
  escalation_reason: string | null;
  escalated_at: Date | null;
  final_decision: string | null;
  decided_at: Date | null;
  score_at_filing: number;
  score_after: number | null;
  current_score: number | null;
  total_marks: number;
  created_at: Date;
  updated_at: Date;
};

const SELECT = `
  SELECT d.*, e.title AS exam_title, e.owner_id, a.show_answers,
         u.name AS candidate_name, aq.position AS question_position,
         a.total_score AS current_score,
         COALESCE((SELECT sum(marks) FROM attempt_questions WHERE attempt_id = d.attempt_id), 0)::numeric AS total_marks
  FROM disputes d
  JOIN exams e ON e.id = d.exam_id
  JOIN attempts a ON a.id = d.attempt_id
  JOIN users u ON u.id = d.candidate_id
  LEFT JOIN attempt_questions aq ON aq.id = d.attempt_question_id`;

const iso = (d: Date | null) => (d ? d.toISOString() : null);
const num = (v: number | null) => (v === null ? null : Number(v));

function toSummary(r: Row): DisputeSummary {
  return {
    id: r.id,
    attemptId: r.attempt_id,
    examId: r.exam_id,
    examTitle: r.exam_title,
    candidateName: r.candidate_name,
    questionNumber: r.question_position === null ? null : r.question_position + 1,
    category: r.category,
    status: r.status,
    outcome: r.outcome,
    scoreAtFiling: Number(r.score_at_filing),
    scoreAfter: num(r.score_after),
    totalMarks: Number(r.total_marks),
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

/** Who may see a dispute: its candidate, the exam owner, any admin. Others get 404. */
function canView(user: SessionUser, r: Pick<Row, "candidate_id" | "owner_id">) {
  if (user.role === "ADMIN") return true;
  if (user.role === "EXAMINER") return r.owner_id === user.id;
  return r.candidate_id === user.id;
}

function escalateBy(r: Row): Date | null {
  return r.resolved_at
    ? new Date(r.resolved_at.getTime() + DISPUTE_ESCALATION_DAYS * DAY_MS)
    : null;
}

/** The single source of truth for what the viewer may do; enforced again on every action. */
function allowedActions(user: SessionUser, r: Row): DisputeAction[] {
  const out: DisputeAction[] = [];
  const live = LIVE.includes(r.status);
  if (user.role === "CANDIDATE" && r.candidate_id === user.id) {
    if (live) out.push("COMMENT");
    if (r.status === "OPEN" || r.status === "UNDER_REVIEW") out.push("WITHDRAW");
    if (r.status === "RESOLVED") {
      out.push("ACCEPT");
      const by = escalateBy(r);
      if (by && by.getTime() > Date.now()) out.push("ESCALATE");
    }
  } else if (user.role === "EXAMINER" && r.owner_id === user.id) {
    if (live) out.push("COMMENT");
    if (r.status === "OPEN") out.push("START_REVIEW");
    if (r.status === "OPEN" || r.status === "UNDER_REVIEW") out.push("RESOLVE");
  } else if (user.role === "ADMIN") {
    if (live) out.push("COMMENT");
    if (r.status === "ESCALATED") out.push("DECIDE");
  }
  return out;
}

async function addEvent(
  c: PoolClient,
  disputeId: string,
  actor: SessionUser | null,
  kind: DisputeEventKind,
  message = "",
  details: Record<string, unknown> = {},
) {
  const r = await c.query<{ id: string }>(
    `INSERT INTO dispute_events (dispute_id, actor_id, actor_name, actor_role, kind, message, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb) RETURNING id::text`,
    [
      disputeId,
      actor?.id ?? null,
      actor?.name ?? "System",
      actor?.role ?? "SYSTEM",
      kind,
      message.slice(0, 2000),
      JSON.stringify(details),
    ],
  );
  return r.rows[0].id;
}

/** Resolutions not escalated within the window become final (lazily, no cron). */
async function expireResolved() {
  await tx(async (c) => {
    const r = await c.query<{ id: string }>(
      `UPDATE disputes SET status = 'CLOSED', updated_at = now()
       WHERE status = 'RESOLVED' AND resolved_at < now() - make_interval(days => $1)
       RETURNING id`,
      [DISPUTE_ESCALATION_DAYS],
    );
    for (const { id } of r.rows) {
      await addEvent(c, id, null, "ACCEPTED", "Escalation window ended; the examiner's resolution is final.");
    }
  });
}

async function adminIds(c: PoolClient) {
  const r = await c.query<{ id: string }>(
    "SELECT id FROM users WHERE role = 'ADMIN' AND is_active",
  );
  return r.rows.map((x) => x.id);
}

const links = (r: Pick<Row, "attempt_id" | "exam_id">) => ({
  candidate: `/attempts/${r.attempt_id}/result#disputes`,
  examiner: `/exams/${r.exam_id}?tab=disputes`,
  admin: "/admin/disputes",
});

const subject = (r: Row) =>
  `${r.question_position === null ? "the overall result" : `Q${r.question_position + 1}`} of "${r.exam_title}"`;

/** Eligibility to file on an attempt (candidate side). */
async function filingState(attemptId: string, candidateId: string) {
  const rows = await query<{
    id: string;
    candidate_id: string;
    status: string;
    is_sandbox: boolean;
    total_score: number | null;
    results_published_at: Date | null;
    cancelled: boolean;
    exam_id: string;
    owner_id: string;
    title: string;
    n: number;
  }>(
    `SELECT a.id, a.candidate_id, a.status, a.is_sandbox, a.total_score,
            e.results_published_at, e.cancelled, e.id AS exam_id, e.owner_id, e.title,
            (SELECT count(*)::int FROM disputes d WHERE d.attempt_id = a.id AND d.status <> 'WITHDRAWN') AS n
     FROM attempts a JOIN exams e ON e.id = a.exam_id WHERE a.id = $1`,
    [attemptId],
  );
  const a = rows[0];
  if (!a || a.is_sandbox || a.candidate_id !== candidateId) return null;
  const fileBy = a.results_published_at
    ? new Date(a.results_published_at.getTime() + DISPUTE_FILING_DAYS * DAY_MS)
    : null;
  let reason: string | null = null;
  if (a.status !== "SUBMITTED") reason = "This attempt has not been submitted.";
  else if (a.cancelled) reason = "This exam was cancelled.";
  else if (!fileBy) reason = "Disputes open once results are published.";
  else if (fileBy.getTime() < Date.now())
    reason = `The ${DISPUTE_FILING_DAYS}-day dispute window for this result has closed.`;
  else if (a.n >= MAX_DISPUTES_PER_ATTEMPT)
    reason = `You have reached the limit of ${MAX_DISPUTES_PER_ATTEMPT} disputes for this result.`;
  return { a, fileBy, reason };
}

async function loadForUpdate(c: PoolClient, id: string): Promise<Row> {
  await c.query("SELECT 1 FROM disputes WHERE id = $1 FOR UPDATE", [id]);
  const r = await c.query<Row>(`${SELECT} WHERE d.id = $1`, [id]);
  if (!r.rows[0]) throw Errors.notFound("Dispute not found");
  return r.rows[0];
}

/** Applies an optional mark correction for the disputed WRITTEN question. Returns the change, if any. */
async function applyMarkChange(
  c: PoolClient,
  user: SessionUser,
  r: Row,
  newScore: number | undefined,
  outcome: DisputeOutcome,
) {
  if (newScore === undefined) return null;
  if (outcome === "REJECTED") {
    throw Errors.badRequest("A rejected dispute cannot change the mark.", {
      newScore: "Remove the new mark or change the outcome",
    });
  }
  if (!r.attempt_question_id) {
    throw Errors.badRequest("This dispute is about the whole result, not one question.");
  }
  const q = await c.query<{ type: string; score: number | null; feedback: string | null }>(
    `SELECT aq.type, ans.score, ans.feedback FROM attempt_questions aq
     LEFT JOIN answers ans ON ans.attempt_question_id = aq.id WHERE aq.id = $1`,
    [r.attempt_question_id],
  );
  const cur = q.rows[0];
  if (cur?.type !== "WRITTEN") {
    throw Errors.badRequest(
      "Objective questions are corrected with an answer-key rescore, which applies to every candidate fairly. Rescore first, then resolve.",
      { newScore: "Not available for objective questions" },
    );
  }
  const from = num(cur.score);
  if (from === newScore) return null;
  await gradeWrittenInTx(
    c,
    user,
    r.attempt_id,
    r.attempt_question_id,
    { score: newScore, feedback: cur.feedback ?? undefined },
    { disputeId: r.id },
  );
  await addEvent(c, r.id, user, "SCORE_CHANGED", "", {
    questionNumber: (r.question_position ?? 0) + 1,
    from,
    to: newScore,
  });
  return { from, to: newScore };
}

async function currentTotal(c: PoolClient, attemptId: string) {
  const r = await c.query<{ total_score: number | null }>(
    "SELECT total_score FROM attempts WHERE id = $1",
    [attemptId],
  );
  return num(r.rows[0]?.total_score ?? null) ?? 0;
}

export const disputeService = {
  /** Candidate files a dispute on their own published result. */
  async create(user: SessionUser, attemptIdRaw: string, input: CreateDisputeInput) {
    if (user.role !== "CANDIDATE") throw Errors.forbidden();
    const attemptId = assertUuid(attemptIdRaw, "Attempt");
    await checkRateLimit(`dispute:${user.id}`, 10, 60 * 60_000);
    const st = await filingState(attemptId, user.id);
    if (!st) throw Errors.notFound("Result not found");
    if (st.reason) throw Errors.conflict(st.reason);

    return tx(async (c) => {
      let position: number | null = null;
      if (input.attemptQuestionId) {
        const q = await c.query<{ position: number }>(
          "SELECT position FROM attempt_questions WHERE id = $1 AND attempt_id = $2",
          [input.attemptQuestionId, attemptId],
        );
        if (!q.rows[0]) throw Errors.badRequest("That question is not part of this attempt.");
        position = q.rows[0].position;
      }
      let id: string;
      try {
        const ins = await c.query<{ id: string }>(
          `INSERT INTO disputes (attempt_id, exam_id, candidate_id, attempt_question_id, category, reason, score_at_filing)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [
            attemptId,
            st.a.exam_id,
            user.id,
            input.attemptQuestionId ?? null,
            input.category,
            input.reason,
            num(st.a.total_score) ?? 0,
          ],
        );
        id = ins.rows[0].id;
      } catch (e) {
        if ((e as { code?: string }).code === "23505") {
          throw Errors.conflict(
            position === null
              ? "You already have an open dispute about the overall result."
              : `You already have an open dispute about Q${position + 1}.`,
          );
        }
        throw e;
      }
      const what = position === null ? "the overall result" : `Q${position + 1}`;
      await addEvent(c, id, user, "FILED", input.reason, { category: input.category });
      await audit(c, user, {
        action: "DISPUTE_FILED",
        examId: st.a.exam_id,
        targetType: "dispute",
        targetId: id,
        summary: `${user.name} disputed ${what} of "${st.a.title}" (${CATEGORY_LABEL[input.category]})`,
        details: { attemptId, category: input.category, questionNumber: position === null ? null : position + 1 },
      });
      await notifyUsers(c, [st.a.owner_id], {
        type: "DISPUTE_FILED",
        title: `New dispute: ${st.a.title}`,
        body: `${user.name} disputed ${what} (${CATEGORY_LABEL[input.category]}).`,
        link: `/exams/${st.a.exam_id}?tab=disputes`,
        examId: st.a.exam_id,
        dedupeKey: `dispute:${id}:filed`,
      });
      return { id };
    });
  },

  async listForAttempt(user: SessionUser, attemptIdRaw: string): Promise<AttemptDisputes> {
    const attemptId = assertUuid(attemptIdRaw, "Attempt");
    await expireResolved();
    const owner = await query<{ candidate_id: string; owner_id: string; is_sandbox: boolean }>(
      `SELECT a.candidate_id, e.owner_id, a.is_sandbox FROM attempts a
       JOIN exams e ON e.id = a.exam_id WHERE a.id = $1`,
      [attemptId],
    );
    if (!owner[0] || owner[0].is_sandbox || !canView(user, owner[0])) {
      throw Errors.notFound("Result not found");
    }
    const rows = await query<Row>(`${SELECT} WHERE d.attempt_id = $1 ORDER BY d.created_at DESC`, [attemptId]);
    const st = user.role === "CANDIDATE" ? await filingState(attemptId, user.id) : null;
    return {
      disputes: rows.map(toSummary),
      canFile: !!st && !st.reason,
      cannotFileReason: user.role === "CANDIDATE" ? (st?.reason ?? null) : "Only the candidate can file a dispute.",
      fileBy: st?.fileBy ? st.fileBy.toISOString() : null,
    };
  },

  async listForExam(user: SessionUser, examIdRaw: string): Promise<DisputeSummary[]> {
    const examId = assertUuid(examIdRaw, "Exam");
    if (user.role === "CANDIDATE") throw Errors.forbidden();
    await expireResolved();
    const ex = await query<{ owner_id: string }>("SELECT owner_id FROM exams WHERE id = $1", [examId]);
    if (!ex[0] || (user.role === "EXAMINER" && ex[0].owner_id !== user.id)) {
      throw Errors.notFound("Exam not found");
    }
    const rows = await query<Row>(`${SELECT} WHERE d.exam_id = $1 ORDER BY d.created_at DESC`, [examId]);
    return rows.map(toSummary);
  },

  /** Admin queue: escalated first, then everything else most recent first. */
  async listAll(user: SessionUser, status?: DisputeStatus): Promise<DisputeSummary[]> {
    if (user.role !== "ADMIN") throw Errors.forbidden();
    await expireResolved();
    const rows = await query<Row>(
      `${SELECT} WHERE ($1::text IS NULL OR d.status = $1)
       ORDER BY (d.status = 'ESCALATED') DESC, d.updated_at DESC LIMIT 200`,
      [status ?? null],
    );
    return rows.map(toSummary);
  },

  async detail(user: SessionUser, idRaw: string): Promise<DisputeDetail> {
    const id = assertUuid(idRaw, "Dispute");
    await expireResolved();
    const rows = await query<Row>(`${SELECT} WHERE d.id = $1`, [id]);
    const r = rows[0];
    if (!r || !canView(user, r)) throw Errors.notFound("Dispute not found");
    const reviewer = user.role !== "CANDIDATE";

    const [events, qRows, incidents] = await Promise.all([
      query<{
        id: string;
        kind: DisputeEventKind;
        actor_name: string;
        actor_role: Role;
        message: string;
        details: Record<string, unknown>;
        created_at: Date;
      }>(
        `SELECT id::text, kind, actor_name, actor_role, message, details, created_at
         FROM dispute_events WHERE dispute_id = $1 ORDER BY id`,
        [id],
      ),
      r.attempt_question_id
        ? query<{
            id: string;
            position: number;
            type: "MCQ_SINGLE" | "MCQ_MULTI" | "WRITTEN";
            body: string;
            marks: number;
            options: { id: number; body: string; isCorrect?: boolean }[];
            score: number | null;
            feedback: string | null;
            text_answer: string | null;
            selected_option_ids: number[] | null;
          }>(
            `SELECT aq.id, aq.position, aq.type, aq.body, aq.marks, aq.options,
                    ans.score, ans.feedback, ans.text_answer, ans.selected_option_ids
             FROM attempt_questions aq LEFT JOIN answers ans ON ans.attempt_question_id = aq.id
             WHERE aq.id = $1`,
            [r.attempt_question_id],
          )
        : Promise.resolve([]),
      reviewer
        ? query<{ type: string; occurred_at: Date }>(
            "SELECT type, occurred_at FROM incidents WHERE attempt_id = $1 ORDER BY occurred_at LIMIT 100",
            [r.attempt_id],
          )
        : Promise.resolve([]),
    ]);

    const q = qRows[0];
    const showKey = reviewer || r.show_answers;
    const allowed = allowedActions(user, r);
    return {
      ...toSummary(r),
      reason: r.reason,
      resolution: r.resolution,
      resolvedAt: iso(r.resolved_at),
      escalationReason: r.escalation_reason,
      escalatedAt: iso(r.escalated_at),
      finalDecision: r.final_decision,
      decidedAt: iso(r.decided_at),
      currentScore: num(r.current_score) ?? 0,
      question: q
        ? {
            attemptQuestionId: q.id,
            position: q.position,
            type: q.type,
            body: q.body,
            marks: Number(q.marks),
            score: num(q.score),
            feedback: q.feedback,
            textAnswer: q.text_answer,
            selected: q.options
              .filter((o) => (q.selected_option_ids ?? []).includes(o.id))
              .map((o) => o.body),
            correct: showKey ? q.options.filter((o) => o.isCorrect).map((o) => o.body) : null,
          }
        : null,
      incidents: incidents.map((i) => ({ type: i.type, occurredAt: i.occurred_at.toISOString() })),
      events: events.map((e) => ({
        id: e.id,
        kind: e.kind,
        actorName: e.actor_name,
        actorRole: e.actor_role,
        message: e.message,
        details: e.details,
        createdAt: e.created_at.toISOString(),
      })),
      allowed,
      escalateBy: allowed.includes("ESCALATE") ? iso(escalateBy(r)) : null,
    };
  },

  /** Every state change goes through here, in one transaction with its events, audit and notifications. */
  async act(user: SessionUser, idRaw: string, input: DisputeActionInput) {
    const id = assertUuid(idRaw, "Dispute");
    await expireResolved();
    return tx(async (c) => {
      const r = await loadForUpdate(c, id);
      if (!canView(user, r)) throw Errors.notFound("Dispute not found");
      if (!allowedActions(user, r).includes(input.action)) {
        throw Errors.conflict("That action is not available for this dispute right now.");
      }
      const l = links(r);
      const notify = (
        to: string[],
        type: "DISPUTE_UPDATED" | "DISPUTE_ESCALATED",
        title: string,
        body: string,
        link: string,
        key: string,
      ) =>
        notifyUsers(c, to.filter((u) => u !== user.id), {
          type,
          title,
          body,
          link,
          examId: r.exam_id,
          dedupeKey: `dispute:${r.id}:${key}`,
        });
      const touch = (sets: string, params: unknown[]) =>
        c.query(`UPDATE disputes SET ${sets}, updated_at = now() WHERE id = $1`, [r.id, ...params]);

      switch (input.action) {
        case "COMMENT": {
          const ev = await addEvent(c, r.id, user, "COMMENT", input.message);
          if (r.status === "OPEN" && user.role === "EXAMINER") {
            await touch("status = 'UNDER_REVIEW'", []);
            await addEvent(c, r.id, user, "REVIEW_STARTED");
          }
          const fromCandidate = user.role === "CANDIDATE";
          await notify(
            fromCandidate ? [r.owner_id, ...(r.status === "ESCALATED" ? await adminIds(c) : [])] : [r.candidate_id],
            "DISPUTE_UPDATED",
            fromCandidate ? "New comment on a dispute" : "New comment on your dispute",
            `${user.name} commented on ${subject(r)}.`,
            fromCandidate ? (r.status === "ESCALATED" ? l.admin : l.examiner) : l.candidate,
            `comment:${ev}`,
          );
          break;
        }
        case "START_REVIEW": {
          await touch("status = 'UNDER_REVIEW'", []);
          await addEvent(c, r.id, user, "REVIEW_STARTED");
          await notify([r.candidate_id], "DISPUTE_UPDATED", "Your dispute is under review",
            `The examiner is reviewing your dispute about ${subject(r)}.`, l.candidate, "review");
          break;
        }
        case "RESOLVE":
        case "DECIDE": {
          const final = input.action === "DECIDE";
          const change = await applyMarkChange(c, user, r, input.newScore, input.outcome);
          const after = await currentTotal(c, r.attempt_id);
          if (final) {
            await touch(
              "status = 'CLOSED', outcome = $2, final_decision = $3, decided_by = $4, decided_at = now(), score_after = $5",
              [input.outcome, input.rationale, user.id, after],
            );
          } else {
            await touch(
              "status = 'RESOLVED', outcome = $2, resolution = $3, resolved_by = $4, resolved_at = now(), score_after = $5",
              [input.outcome, input.rationale, user.id, after],
            );
          }
          await addEvent(c, r.id, user, final ? "DECIDED" : "RESOLVED", input.rationale, {
            outcome: input.outcome,
            scoreBefore: Number(r.score_at_filing),
            scoreAfter: after,
            markChange: change,
          });
          await audit(c, user, {
            action: final ? "DISPUTE_DECIDED" : "DISPUTE_RESOLVED",
            examId: r.exam_id,
            targetType: "dispute",
            targetId: r.id,
            summary: `${final ? "Final decision" : "Resolved"} on ${r.candidate_name}'s dispute about ${subject(r)}: ${OUTCOME_LABEL[input.outcome]}${change ? ` (mark ${change.from ?? "–"} → ${change.to})` : ""}`,
            details: { outcome: input.outcome, scoreBefore: Number(r.score_at_filing), scoreAfter: after, markChange: change },
          });
          const outcomeText = `${OUTCOME_LABEL[input.outcome]}. Score ${Number(r.score_at_filing)} → ${after} / ${Number(r.total_marks)}.`;
          await notify([r.candidate_id], "DISPUTE_UPDATED",
            final ? "Final decision on your dispute" : "Your dispute was resolved",
            `${subject(r)}: ${outcomeText}${final ? "" : ` You can accept it or escalate within ${DISPUTE_ESCALATION_DAYS} days.`}`,
            l.candidate, final ? "decided" : "resolved");
          if (final) {
            await notify([r.owner_id], "DISPUTE_UPDATED", "Admin decided an escalated dispute",
              `${r.candidate_name}, ${subject(r)}: ${outcomeText}`, l.examiner, "decided-owner");
          }
          break;
        }
        case "ACCEPT": {
          await touch("status = 'CLOSED'", []);
          await addEvent(c, r.id, user, "ACCEPTED");
          await notify([r.owner_id], "DISPUTE_UPDATED", "Dispute resolution accepted",
            `${r.candidate_name} accepted your resolution of ${subject(r)}.`, l.examiner, "accepted");
          break;
        }
        case "ESCALATE": {
          await touch("status = 'ESCALATED', escalation_reason = $2, escalated_at = now()", [input.reason]);
          await addEvent(c, r.id, user, "ESCALATED", input.reason);
          await audit(c, user, {
            action: "DISPUTE_ESCALATED",
            examId: r.exam_id,
            targetType: "dispute",
            targetId: r.id,
            summary: `${user.name} escalated their dispute about ${subject(r)} to an administrator`,
            details: { previousOutcome: r.outcome },
          });
          await notify(await adminIds(c), "DISPUTE_ESCALATED", `Escalated dispute: ${r.exam_title}`,
            `${r.candidate_name} escalated ${subject(r)} after it was ${OUTCOME_LABEL[r.outcome!].toLowerCase()}.`,
            l.admin, "escalated");
          await notify([r.owner_id], "DISPUTE_UPDATED", "Dispute escalated to an admin",
            `${r.candidate_name} escalated ${subject(r)}.`, l.examiner, "escalated-owner");
          break;
        }
        case "WITHDRAW": {
          await touch("status = 'WITHDRAWN'", []);
          await addEvent(c, r.id, user, "WITHDRAWN");
          await notify([r.owner_id], "DISPUTE_UPDATED", "Dispute withdrawn",
            `${r.candidate_name} withdrew their dispute about ${subject(r)}.`, l.examiner, "withdrawn");
          break;
        }
      }
      return { id: r.id };
    });
  },
};
