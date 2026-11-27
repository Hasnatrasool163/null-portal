"use client";
import { examsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { SummaryShell } from "./summary-shell";
import { useAiSummary } from "./use-ai-summary";

/** Examiner-facing AI summary of cohort performance on one exam. */
export function ExamAnalyticsAiSummaryCard({ examId }: { examId: string }) {
  const s = useAiSummary({
    queryKey: qk.exams.analyticsSummary(examId),
    fetchCached: () => examsApi.analyticsSummary(examId),
    generate: (refresh) => examsApi.generateAnalyticsSummary(examId, refresh),
  });
  const data = s.data;

  return (
    <SummaryShell
      title="AI cohort summary"
      emptyDescription="Generate a quick executive takeaway of cohort performance, tricky questions, and follow-up actions."
      footnote="AI-generated from real submitted attempts (sandbox previews excluded). Verify item statistics below before making grading changes."
      data={data}
      isInitialLoading={s.isInitialLoading}
      isGenerating={s.isGenerating}
      errorMessage={s.errorMessage}
      headline={data?.summary.overview ?? null}
      sections={
        data
          ? [
              {
                title: "Strong areas",
                items: data.summary.strongAreas,
                tone: "success",
              },
              {
                title: "Needs attention",
                items: data.summary.attentionItems,
                tone: "warning",
              },
              {
                title: "Recommendations",
                items: data.summary.recommendations,
                tone: "primary",
              },
            ]
          : []
      }
      onGenerate={s.generate}
    />
  );
}
