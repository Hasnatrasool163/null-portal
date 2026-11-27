"use client";
import { Card } from "@/components/ui/card";
import type { ExamAnalyticsResponse } from "@/shared/schemas/secondary";

/** Headline numbers: submitted count and average / highest / lowest score. */
export function AnalyticsStatsStrip({ data }: { data: ExamAnalyticsResponse }) {
  const avgPct =
    data.averageScore !== null && data.totalMarks > 0
      ? Math.round((data.averageScore / data.totalMarks) * 100)
      : null;
  const stats = [
    { label: "Submitted", value: data.submittedAttempts, sub: "attempts" },
    {
      label: "Average",
      value: data.averageScore ?? "—",
      sub: avgPct !== null ? `of ${data.totalMarks} · ${avgPct}%` : `of ${data.totalMarks}`,
    },
    { label: "Highest", value: data.highestScore ?? "—", sub: `of ${data.totalMarks}` },
    { label: "Lowest", value: data.lowestScore ?? "—", sub: `of ${data.totalMarks}` },
  ];

  return (
    <Card className="grid grid-cols-2 divide-y sm:grid-cols-4 sm:divide-x sm:divide-y-0">
      {stats.map((st) => (
        <div key={st.label} className="px-5 py-4">
          <p className="text-muted-foreground text-xs">{st.label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{st.value}</p>
          <p className="text-muted-foreground text-xs">{st.sub}</p>
        </div>
      ))}
    </Card>
  );
}
