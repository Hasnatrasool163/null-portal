import { z } from "zod";

export const aiSummaryRequestSchema = z.object({
  refresh: z.boolean().optional(),
});
export type AiSummaryRequest = z.infer<typeof aiSummaryRequestSchema>;

export const candidateResultSummarySchema = z.object({
  headline: z.string().trim().min(1).max(320),
  strengths: z.array(z.string().trim().min(1).max(240)).max(4),
  areasToImprove: z.array(z.string().trim().min(1).max(240)).max(4),
  nextSteps: z.array(z.string().trim().min(1).max(240)).min(1).max(4),
});
export type CandidateResultSummary = z.infer<typeof candidateResultSummarySchema>;

export const examAnalyticsSummarySchema = z.object({
  overview: z.string().trim().min(1).max(360),
  strongAreas: z.array(z.string().trim().min(1).max(240)).max(4),
  attentionItems: z.array(z.string().trim().min(1).max(240)).max(4),
  recommendations: z.array(z.string().trim().min(1).max(240)).min(1).max(4),
});
export type ExamAnalyticsSummary = z.infer<typeof examAnalyticsSummarySchema>;

export type AiSummaryEnvelope<T> = {
  summary: T;
  provider: string;
  model: string;
  generatedAt: string;
  cached: boolean;
  stale: boolean;
};

export type CandidateSummaryResponse = AiSummaryEnvelope<CandidateResultSummary>;
export type ExamAnalyticsSummaryResponse = AiSummaryEnvelope<ExamAnalyticsSummary>;
