"use client";
import { attemptsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { SummaryShell } from "./summary-shell";
import { useAiSummary } from "./use-ai-summary";

/** Candidate-facing AI summary of one published attempt result. */
export function AttemptAiSummaryCard({ attemptId }: { attemptId: string }) {
  const s = useAiSummary({
    queryKey: qk.attempts.summary(attemptId),
    fetchCached: () => attemptsApi.summary(attemptId),
    generate: (refresh) => attemptsApi.generateSummary(attemptId, refresh),
  });
  const data = s.data;

  return (
    <SummaryShell
      title="AI quick summary"
      emptyDescription="Get an instant breakdown of your strengths, focus areas, and next study steps."
      footnote="AI-generated from your published result data. Official marks and examiner feedback take precedence."
      data={data}
      isInitialLoading={s.isInitialLoading}
      isGenerating={s.isGenerating}
      errorMessage={s.errorMessage}
      headline={data?.summary.headline ?? null}
      sections={
        data
          ? [
              {
                title: "Strengths",
                items: data.summary.strengths,
                tone: "success",
              },
              {
                title: "Areas to improve",
                items: data.summary.areasToImprove,
                tone: "warning",
              },
              {
                title: "Next steps",
                items: data.summary.nextSteps,
                tone: "primary",
              },
            ]
          : []
      }
      onGenerate={s.generate}
    />
  );
}
