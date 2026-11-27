import "server-only";
import { tx } from "./db";
import {
  DISPUTE_AUTO_ESCALATE_DAYS,
  DISPUTE_ESCALATION_DAYS,
  DISPUTE_REMINDER_HOURS,
} from "@/shared/schemas/dispute";

/*
 * Time-based dispute rules, run lazily (no cron) whenever someone loads notifications or a
 * dispute view. Every step is idempotent: state changes use guarded UPDATEs and notifications
 * use unique dedupe keys, so concurrent or repeated runs never double-act.
 */

const SUBJECT = `CASE WHEN aq.position IS NULL THEN 'the overall result' ELSE 'Q' || (aq.position + 1) END || ' of "' || e.title || '"'`;
const FROM = `FROM disputes d
  JOIN exams e ON e.id = d.exam_id
  JOIN users cu ON cu.id = d.candidate_id
  LEFT JOIN attempt_questions aq ON aq.id = d.attempt_question_id`;
const candidateLink = `'/attempts/' || d.attempt_id || '/result#disputes'`;
const examinerLink = `'/exams/' || d.exam_id || '?tab=disputes'`;

const MIN_INTERVAL_MS = 30_000;
let lastRun = 0;

export async function runDisputeClock(force = false) {
  if (!force && Date.now() - lastRun < MIN_INTERVAL_MS) return;
  lastRun = Date.now();
  try {
    await tick();
  } catch (e) {
    // Never let a background rule break the request that triggered it (e.g. the bell poll).
    console.error("[dispute-clock] failed:", e);
  }
}

async function tick() {
  await tx(async (c) => {
    // 1. Unresolved for too long: escalate automatically so a slow examiner can't stall the candidate.
    const escalated = await c.query<{ id: string }>(
      `UPDATE disputes SET status = 'ESCALATED', escalated_at = now(), updated_at = now(),
              escalation_reason = 'Escalated automatically: the examiner did not resolve this dispute within ' || $1::int || ' days.'
       WHERE status IN ('OPEN', 'UNDER_REVIEW') AND created_at < now() - make_interval(days => $1::int)
       RETURNING id`,
      [DISPUTE_AUTO_ESCALATE_DAYS],
    );
    const ids = escalated.rows.map((r) => r.id);
    if (ids.length > 0) {
      await c.query(
        `INSERT INTO dispute_events (dispute_id, actor_name, actor_role, kind, message)
         SELECT unnest($1::uuid[]), 'System', 'SYSTEM', 'ESCALATED',
                'Escalated automatically: the examiner did not resolve this dispute within ' || $2::int || ' days.'`,
        [ids, DISPUTE_AUTO_ESCALATE_DAYS],
      );
      await c.query(
        `INSERT INTO audit_log (actor_id, actor_name, actor_role, action, exam_id, target_type, target_id, summary, details)
         SELECT NULL, 'System', 'SYSTEM', 'DISPUTE_ESCALATED', d.exam_id, 'dispute', d.id::text,
                left('Auto-escalated ' || cu.name || '''s dispute about ' || ${SUBJECT} || ' (no examiner resolution in ' || $2::int || ' days)', 500),
                jsonb_build_object('automatic', true, 'days', $2::int)
         ${FROM} WHERE d.id = ANY($1::uuid[])`,
        [ids, DISPUTE_AUTO_ESCALATE_DAYS],
      );
      // Admins: overdue alert. Candidate and examiner: what happened.
      await c.query(
        `INSERT INTO notifications (user_id, type, title, body, link, exam_id, dedupe_key)
         SELECT ad.id, 'DISPUTE_OVERDUE', left('Overdue dispute escalated: ' || e.title, 200),
                left(cu.name || '''s dispute about ' || ${SUBJECT} || ' had no examiner decision in ' || $2::int || ' days and needs your decision.', 1000),
                '/admin/disputes', d.exam_id, 'dispute:' || d.id || ':overdue'
         ${FROM} CROSS JOIN users ad
         WHERE d.id = ANY($1::uuid[]) AND ad.role = 'ADMIN' AND ad.is_active
         UNION ALL
         SELECT d.candidate_id, 'DISPUTE_UPDATED', 'Your dispute was escalated to an administrator',
                left('The examiner did not resolve your dispute about ' || ${SUBJECT} || ' within ' || $2::int || ' days, so an administrator will decide it.', 1000),
                ${candidateLink}, d.exam_id, 'dispute:' || d.id || ':auto-escalated'
         ${FROM} WHERE d.id = ANY($1::uuid[])
         UNION ALL
         SELECT e.owner_id, 'DISPUTE_UPDATED', 'Dispute escalated automatically',
                left(cu.name || '''s dispute about ' || ${SUBJECT} || ' went ' || $2::int || ' days without your decision and was escalated to an administrator.', 1000),
                ${examinerLink}, d.exam_id, 'dispute:' || d.id || ':auto-escalated-owner'
         ${FROM} WHERE d.id = ANY($1::uuid[])
         ON CONFLICT (user_id, dedupe_key) DO NOTHING`,
        [ids, DISPUTE_AUTO_ESCALATE_DAYS],
      );
    }

    // 2. Examiner reminder: no resolution after 48h.
    await c.query(
      `INSERT INTO notifications (user_id, type, title, body, link, exam_id, dedupe_key)
       SELECT e.owner_id, 'DISPUTE_REMINDER', left('Dispute waiting for your decision: ' || e.title, 200),
              left(cu.name || '''s dispute about ' || ${SUBJECT} || ' has had no decision for ' || $1::int || ' hours. It is escalated to an administrator automatically after ' || $2::int || ' days.', 1000),
              ${examinerLink}, d.exam_id, 'dispute:' || d.id || ':reminder'
       ${FROM}
       WHERE d.status IN ('OPEN', 'UNDER_REVIEW') AND d.created_at < now() - make_interval(hours => $1::int)
       ON CONFLICT (user_id, dedupe_key) DO NOTHING`,
      [DISPUTE_REMINDER_HOURS, DISPUTE_AUTO_ESCALATE_DAYS],
    );

    // 3. Candidate: less than 24h left to escalate a resolution.
    await c.query(
      `INSERT INTO notifications (user_id, type, title, body, link, exam_id, dedupe_key)
       SELECT d.candidate_id, 'DISPUTE_DEADLINE', 'You have 24 hours left to escalate',
              left('Your dispute about ' || ${SUBJECT} || ' was resolved. If you disagree, escalate it within 24 hours; after that the decision is final.', 1000),
              ${candidateLink}, d.exam_id, 'dispute:' || d.id || ':deadline'
       ${FROM}
       WHERE d.status = 'RESOLVED'
         AND d.resolved_at < now() - make_interval(days => $1::int) + interval '24 hours'
         AND d.resolved_at >= now() - make_interval(days => $1::int)
       ON CONFLICT (user_id, dedupe_key) DO NOTHING`,
      [DISPUTE_ESCALATION_DAYS],
    );

    // 4. Escalation window over: the examiner's resolution becomes final.
    const finalized = await c.query<{ id: string }>(
      `UPDATE disputes SET status = 'CLOSED', updated_at = now()
       WHERE status = 'RESOLVED' AND resolved_at < now() - make_interval(days => $1::int)
       RETURNING id`,
      [DISPUTE_ESCALATION_DAYS],
    );
    const fids = finalized.rows.map((r) => r.id);
    if (fids.length > 0) {
      await c.query(
        `INSERT INTO dispute_events (dispute_id, actor_name, actor_role, kind, message)
         SELECT unnest($1::uuid[]), 'System', 'SYSTEM', 'ACCEPTED',
                'The escalation window ended, so the examiner''s resolution is now final.'`,
        [fids],
      );
      await c.query(
        `INSERT INTO notifications (user_id, type, title, body, link, exam_id, dedupe_key)
         SELECT d.candidate_id, 'DISPUTE_FINAL', 'Your dispute decision is now final',
                left('The escalation window for ' || ${SUBJECT} || ' has ended. The examiner''s decision stands.', 1000),
                ${candidateLink}, d.exam_id, 'dispute:' || d.id || ':final'
         ${FROM} WHERE d.id = ANY($1::uuid[])
         UNION ALL
         SELECT e.owner_id, 'DISPUTE_FINAL', 'Dispute closed: decision is final',
                left(cu.name || '''s dispute about ' || ${SUBJECT} || ' was not escalated, so your resolution is final.', 1000),
                ${examinerLink}, d.exam_id, 'dispute:' || d.id || ':final-owner'
         ${FROM} WHERE d.id = ANY($1::uuid[])
         ON CONFLICT (user_id, dedupe_key) DO NOTHING`,
        [fids],
      );
    }
  });
}
