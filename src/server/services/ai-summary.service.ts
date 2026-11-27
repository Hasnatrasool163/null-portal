import "server-only";
import { createHash } from "node:crypto";
import { query } from "../db";
import { ApiError, Errors } from "../http";
import { gradingService } from "./grading.service";
import { secondaryService } from "./secondary.service";
import { structuredWithMeta } from "@/lib/llm";
import {
  candidateResultSummarySchema,
  examAnalyticsSummarySchema,
  type CandidateSummaryResponse,
  type ExamAnalyticsSummaryResponse,
} from "@/shared/schemas/ai-summary";
import type { SessionUser } from "@/shared/schemas/auth";
import type { CandidateResultQuestion, CandidateResultView } from "@/shared/schemas/grading";
import type { ExamAnalyticsResponse } from "@/shared/schemas/secondary";

type SummaryRow = {
  data_hash: string;
  summary: unknown;
  provider: string;
  model: string;
  generated_at: Date;
};

const clip = (s: string | null | undefined, max: number) => {
  if (!s) return "";
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

function hashPayload(payload: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 32);
}

function questionOutcome(q: CandidateResultQuestion) {
  const answered =
    q.selectedOptionIds.length > 0 || (q.textAnswer?.trim().length ?? 0) > 0;
  if (!answered) return "skipped";
  if (q.score === null) return "pending";
  if (q.score >= q.marks) return "full";
  if (q.score > 0) return "partial";
  return "incorrect";
}

function attemptFingerprint(r: CandidateResultView, revealKey: boolean) {
  return hashPayload({
    v: 1,
    revealKey,
    totalScore: r.totalScore,
    totalMarks: r.totalMarks,
    gradingStatus: r.gradingStatus,
    questions: r.questions.map((q) => ({
      id: q.attemptQuestionId,
      score: q.score,
      marks: q.marks,
      feedback: q.feedback ?? "",
      outcome: questionOutcome(q),
    })),
  });
}

function examAnalyticsFingerprint(a: ExamAnalyticsResponse) {
  return hashPayload({
    v: 1,
    submittedAttempts: a.submittedAttempts,
    averageScore: a.averageScore,
    highestScore: a.highestScore,
    lowestScore: a.lowestScore,
    totalMarks: a.totalMarks,
    questions: a.questions.map((q) => ({
      id: q.questionId,
      attempts: q.attempts,
      percentCorrect: q.percentCorrect,
      avgScorePct: q.avgScorePct,
      skipRate: q.skipRate,
      observedDifficulty: q.observedDifficulty,
    })),
  });
}

async function fetchAttemptTopics(attemptId: string): Promise<Map<string, string>> {
  const rows = await query<{
    attempt_question_id: string;
    topic_name: string | null;
  }>(
    `SELECT aq.id AS attempt_question_id, t.name AS topic_name
     FROM attempt_questions aq
     LEFT JOIN questions q ON q.id = aq.question_id
     LEFT JOIN topics t ON t.id = q.topic_id
     WHERE aq.attempt_id = $1`,
    [attemptId],
  );
  return new Map(
    rows.map((r) => [r.attempt_question_id, r.topic_name ?? "General"]),
  );
}

export const aiSummaryService = {
  /** Return cached attempt summary if one exists (never calls the LLM). */
  async getCachedAttemptSummary(
    user: SessionUser,
    attemptIdRaw: string,
  ): Promise<CandidateSummaryResponse | null> {
    const result = await gradingService.getCandidateResult(user, attemptIdRaw);
    const revealKey = user.role !== "CANDIDATE" || result.showAnswers;
    const scope = revealKey ? "ATTEMPT_PUBLIC" : "ATTEMPT_PRIVATE";
    const dataHash = attemptFingerprint(result, revealKey);

    const rows = await query<SummaryRow>(
      `SELECT data_hash, summary, provider, model, generated_at
       FROM ai_result_summaries
       WHERE attempt_id = $1 AND scope = $2`,
      [result.attemptId, scope],
    );
    const row = rows[0];
    if (!row) return null;

    const parsed = candidateResultSummarySchema.safeParse(row.summary);
    if (!parsed.success) return null;

    return {
      summary: parsed.data,
      provider: row.provider,
      model: row.model,
      generatedAt: row.generated_at.toISOString(),
      cached: true,
      stale: row.data_hash !== dataHash,
    };
  },

  /** Generate (or return fresh cached) AI quick summary for an attempt result. */
  async generateAttemptSummary(
    user: SessionUser,
    attemptIdRaw: string,
    refresh = false,
  ): Promise<CandidateSummaryResponse> {
    const result = await gradingService.getCandidateResult(user, attemptIdRaw);
    const revealKey = user.role !== "CANDIDATE" || result.showAnswers;
    const scope = revealKey ? "ATTEMPT_PUBLIC" : "ATTEMPT_PRIVATE";
    const dataHash = attemptFingerprint(result, revealKey);

    if (!refresh) {
      const existing = await query<SummaryRow>(
        `SELECT data_hash, summary, provider, model, generated_at
         FROM ai_result_summaries
         WHERE attempt_id = $1 AND scope = $2`,
        [result.attemptId, scope],
      );
      const row = existing[0];
      if (row && row.data_hash === dataHash) {
        const parsed = candidateResultSummarySchema.safeParse(row.summary);
        if (parsed.success) {
          return {
            summary: parsed.data,
            provider: row.provider,
            model: row.model,
            generatedAt: row.generated_at.toISOString(),
            cached: true,
            stale: false,
          };
        }
      }
    }

    const topicByAq = await fetchAttemptTopics(result.attemptId);

    const topicStats = new Map<
      string,
      { topic: string; earned: number; possible: number; questions: number; full: number; skipped: number }
    >();
    const tally = { full: 0, partial: 0, incorrect: 0, skipped: 0, pending: 0 };

    const questionItems = result.questions.map((q) => {
      const outcome = questionOutcome(q);
      tally[outcome]++;
      const topic = topicByAq.get(q.attemptQuestionId) ?? "General";
      const entry = topicStats.get(topic) ?? {
        topic,
        earned: 0,
        possible: 0,
        questions: 0,
        full: 0,
        skipped: 0,
      };
      entry.earned += q.score ?? 0;
      entry.possible += q.marks;
      entry.questions += 1;
      if (outcome === "full") entry.full += 1;
      if (outcome === "skipped") entry.skipped += 1;
      topicStats.set(topic, entry);

      return {
        q: q.position + 1,
        topic,
        type: q.type,
        score: q.score,
        marks: q.marks,
        outcome,
        prompt: clip(q.body, 140),
        feedback: clip(q.feedback, 180) || undefined,
      };
    });

    const promptData = {
      examTitle: result.examTitle,
      totalScore: result.totalScore,
      totalMarks: result.totalMarks,
      percentage: result.percentage,
      questionCount: result.questions.length,
      tally,
      topics: Array.from(topicStats.values()).map((t) => ({
        topic: t.topic,
        score: `${Number(t.earned.toFixed(1))}/${Number(t.possible.toFixed(1))}`,
        pct: t.possible > 0 ? Math.round((t.earned / t.possible) * 100) : 0,
        questions: t.questions,
        fullMarks: t.full,
        skipped: t.skipped,
      })),
      questions: questionItems.slice(0, 40),
    };

    const keyRule = revealKey
      ? "You may reference which questions or topics were missed or partially answered."
      : "Answer keys are hidden for this exam. NEVER reveal, hint at, or guess specific correct answers.";

    let generated;
    try {
      generated = await structuredWithMeta(
        candidateResultSummarySchema,
        [
          {
            role: "system",
            content: [
              "You are a concise, encouraging academic coach summarizing an exam result for a student.",
              "Return ONLY valid JSON matching this exact shape:",
              '{ "headline": string, "strengths": string[], "areasToImprove": string[], "nextSteps": string[] }',
              "Rules:",
              "- Base every statement strictly on the provided numbers, topics, outcomes, and examiner feedback.",
              "- headline: 1 clear sentence summarizing overall performance (max 220 chars).",
              "- strengths: 1-3 short, specific bullets (empty array only if score is 0).",
              "- areasToImprove: 1-3 short, specific bullets (empty array if 100% with no gaps).",
              "- nextSteps: 2-3 concrete, actionable study steps tailored to the missed/weak topics or skipped items.",
              `- ${keyRule}`,
              "- Do not use markdown formatting or bullet characters inside the JSON strings.",
            ].join("\n"),
          },
          {
            role: "user",
            content: `Summarize this exam attempt result:\n${JSON.stringify(promptData)}`,
          },
        ],
        { temperature: 0.3, maxTokens: 900, cache: !refresh },
      );
    } catch (e) {
      console.error("[ai-summary] attempt summary failed:", e);
      throw new ApiError(
        503,
        "AI_UNAVAILABLE",
        "AI summary is temporarily unavailable. Please try again in a moment.",
      );
    }

    const [saved] = await query<{ generated_at: Date }>(
      `INSERT INTO ai_result_summaries (scope, attempt_id, data_hash, summary, provider, model)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)
       ON CONFLICT (attempt_id, scope) WHERE attempt_id IS NOT NULL DO UPDATE SET
         data_hash = EXCLUDED.data_hash,
         summary = EXCLUDED.summary,
         provider = EXCLUDED.provider,
         model = EXCLUDED.model,
         generated_at = now()
       RETURNING generated_at`,
      [
        scope,
        result.attemptId,
        dataHash,
        JSON.stringify(generated.data),
        generated.provider,
        generated.model,
      ],
    );

    return {
      summary: generated.data,
      provider: generated.provider,
      model: generated.model,
      generatedAt: saved.generated_at.toISOString(),
      cached: false,
      stale: false,
    };
  },

  /** Return cached examiner analytics summary if one exists (never calls the LLM). */
  async getCachedExamAnalyticsSummary(
    user: SessionUser,
    examIdRaw: string,
  ): Promise<ExamAnalyticsSummaryResponse | null> {
    const analytics = await secondaryService.getExamAnalytics(user, examIdRaw);
    if (analytics.submittedAttempts === 0) return null;

    const dataHash = examAnalyticsFingerprint(analytics);
    const rows = await query<SummaryRow>(
      `SELECT data_hash, summary, provider, model, generated_at
       FROM ai_result_summaries
       WHERE exam_id = $1 AND scope = 'EXAM_ANALYTICS'`,
      [analytics.examId],
    );
    const row = rows[0];
    if (!row) return null;

    const parsed = examAnalyticsSummarySchema.safeParse(row.summary);
    if (!parsed.success) return null;

    return {
      summary: parsed.data,
      provider: row.provider,
      model: row.model,
      generatedAt: row.generated_at.toISOString(),
      cached: true,
      stale: row.data_hash !== dataHash,
    };
  },

  /** Generate (or return fresh cached) AI quick summary for exam-level cohort analytics. */
  async generateExamAnalyticsSummary(
    user: SessionUser,
    examIdRaw: string,
    refresh = false,
  ): Promise<ExamAnalyticsSummaryResponse> {
    const analytics = await secondaryService.getExamAnalytics(user, examIdRaw);
    if (analytics.submittedAttempts === 0) {
      throw Errors.conflict("No submitted attempts yet to summarize.");
    }

    const dataHash = examAnalyticsFingerprint(analytics);

    if (!refresh) {
      const existing = await query<SummaryRow>(
        `SELECT data_hash, summary, provider, model, generated_at
         FROM ai_result_summaries
         WHERE exam_id = $1 AND scope = 'EXAM_ANALYTICS'`,
        [analytics.examId],
      );
      const row = existing[0];
      if (row && row.data_hash === dataHash) {
        const parsed = examAnalyticsSummarySchema.safeParse(row.summary);
        if (parsed.success) {
          return {
            summary: parsed.data,
            provider: row.provider,
            model: row.model,
            generatedAt: row.generated_at.toISOString(),
            cached: true,
            stale: false,
          };
        }
      }
    }

    const topicMap = new Map<
      string,
      { topic: string; count: number; avgPctSum: number; skipSum: number }
    >();
    for (const q of analytics.questions) {
      const t = topicMap.get(q.topicName) ?? {
        topic: q.topicName,
        count: 0,
        avgPctSum: 0,
        skipSum: 0,
      };
      t.count += 1;
      t.avgPctSum += q.avgScorePct;
      t.skipSum += q.skipRate;
      topicMap.set(q.topicName, t);
    }

    const avgPct =
      analytics.averageScore !== null && analytics.totalMarks > 0
        ? Math.round((analytics.averageScore / analytics.totalMarks) * 100)
        : null;

    const promptData = {
      examTitle: analytics.examTitle,
      submittedAttempts: analytics.submittedAttempts,
      totalMarks: analytics.totalMarks,
      averageScore: analytics.averageScore,
      averagePct: avgPct,
      highestScore: analytics.highestScore,
      lowestScore: analytics.lowestScore,
      topics: Array.from(topicMap.values()).map((t) => ({
        topic: t.topic,
        questions: t.count,
        avgScorePct: Math.round(t.avgPctSum / t.count),
        avgSkipRate: Math.round(t.skipSum / t.count),
      })),
      questions: analytics.questions.slice(0, 40).map((q) => ({
        q: q.position + 1,
        topic: q.topicName,
        type: q.type,
        marks: q.marks,
        declaredDifficulty: q.declaredDifficulty,
        observedDifficulty: q.observedDifficulty,
        difficultyMismatch: q.difficultyMismatch,
        percentCorrect: q.percentCorrect,
        avgScorePct: q.avgScorePct,
        skipRate: q.skipRate,
        mostCommonWrong: clip(q.mostCommonWrong, 100) || undefined,
        prompt: clip(q.body, 120),
      })),
    };

    let generated;
    try {
      generated = await structuredWithMeta(
        examAnalyticsSummarySchema,
        [
          {
            role: "system",
            content: [
              "You are an assessment analyst writing a concise executive summary of exam cohort results for an examiner.",
              "Return ONLY valid JSON matching this exact shape:",
              '{ "overview": string, "strongAreas": string[], "attentionItems": string[], "recommendations": string[] }',
              "Rules:",
              "- Base every claim strictly on the provided cohort metrics, topics, and question statistics.",
              "- overview: 1-2 crisp sentences summarizing overall cohort performance and score spread.",
              "- strongAreas: 1-3 short bullets highlighting topics or questions candidates performed well on.",
              "- attentionItems: 1-3 short bullets flagging tough questions, high skip rates, difficulty mismatches, or popular wrong distractors (reference Q#).",
              "- recommendations: 2-3 actionable follow-ups (e.g., topics to reteach, questions to review or recalibrate).",
              "- Do not use markdown formatting or bullet characters inside the JSON strings.",
            ].join("\n"),
          },
          {
            role: "user",
            content: `Summarize these exam cohort analytics:\n${JSON.stringify(promptData)}`,
          },
        ],
        { temperature: 0.3, maxTokens: 1000, cache: !refresh },
      );
    } catch (e) {
      console.error("[ai-summary] exam analytics summary failed:", e);
      throw new ApiError(
        503,
        "AI_UNAVAILABLE",
        "AI summary is temporarily unavailable. Please try again in a moment.",
      );
    }

    const [saved] = await query<{ generated_at: Date }>(
      `INSERT INTO ai_result_summaries (scope, exam_id, data_hash, summary, provider, model)
       VALUES ('EXAM_ANALYTICS', $1, $2, $3::jsonb, $4, $5)
       ON CONFLICT (exam_id, scope) WHERE exam_id IS NOT NULL DO UPDATE SET
         data_hash = EXCLUDED.data_hash,
         summary = EXCLUDED.summary,
         provider = EXCLUDED.provider,
         model = EXCLUDED.model,
         generated_at = now()
       RETURNING generated_at`,
      [
        analytics.examId,
        dataHash,
        JSON.stringify(generated.data),
        generated.provider,
        generated.model,
      ],
    );

    return {
      summary: generated.data,
      provider: generated.provider,
      model: generated.model,
      generatedAt: saved.generated_at.toISOString(),
      cached: false,
      stale: false,
    };
  },
};
