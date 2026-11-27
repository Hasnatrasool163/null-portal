"use client";
import { useQuery } from "@tanstack/react-query";
import { DownloadButton } from "@/components/ui/download-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { EmptyState } from "@/components/ui/blocks";
import { ExamAnalyticsAiSummaryCard } from "@/components/ai/ai-summary-card";
import { AnalyticsStatsStrip } from "@/components/exams/analytics/analytics-stats-strip";
import { QuestionAnalyticsTable } from "@/components/exams/analytics/question-analytics-table";
import { QuestionPerformanceChart } from "@/components/exams/analytics/question-performance-chart";
import { examsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";

export function ExamAnalyticsTab({ examId }: { examId: string }) {
  const query = useQuery({
    queryKey: qk.exams.analytics(examId),
    queryFn: () => examsApi.analytics(examId),
  });

  if (query.isPending) return <Skeleton className="h-64 w-full" />;
  if (query.isError) {
    return (
      <EmptyState
        title="Could not load analytics"
        text={query.error.message}
        action={<Button onClick={() => query.refetch()}>Try again</Button>}
      />
    );
  }

  const data = query.data;
  if (data.submittedAttempts === 0) {
    return (
      <EmptyState
        title="No submitted real attempts yet"
        text="Analytics are calculated strictly from real submitted attempts (sandbox previews are excluded)."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          From {data.submittedAttempts} submitted attempt{data.submittedAttempts === 1 ? "" : "s"}.
          Sandbox previews are excluded.
        </p>
        {/* File download, not a JSON endpoint, so it stays a plain URL. */}
        <DownloadButton size="sm" href={examsApi.reportPdfUrl(examId)} fallbackName="exam-summary.pdf">
          Download summary PDF
        </DownloadButton>
      </div>

      <AnalyticsStatsStrip data={data} />

      {/* AI Cohort Summary */}
      <ExamAnalyticsAiSummaryCard examId={examId} />

      <QuestionPerformanceChart questions={data.questions} />

      <QuestionAnalyticsTable questions={data.questions} />
    </div>
  );
}
