"use client";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import { DownloadButton } from "@/components/ui/download-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";
import { EmptyState } from "@/components/ui/blocks";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api-client";
import { DIFFICULTY_LABEL, TYPE_LABEL } from "@/shared/schemas/question";
import type { ExamAnalyticsResponse } from "@/shared/schemas/secondary";

export function ExamAnalyticsTab({ examId }: { examId: string }) {
  const query = useQuery({
    queryKey: ["exam-analytics", examId],
    queryFn: () =>
      api<ExamAnalyticsResponse>(`/api/exams/${examId}/analytics`),
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

  const chartData = data.questions.map((q) => ({
    name: `Q${q.position + 1}`,
    accuracy: q.avgScorePct,
    skipRate: q.skipRate,
  }));
  const avgPct =
    data.averageScore !== null && data.totalMarks > 0
      ? Math.round((data.averageScore / data.totalMarks) * 100)
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          From {data.submittedAttempts} submitted attempt{data.submittedAttempts === 1 ? "" : "s"}.
          Sandbox previews are excluded.
        </p>
        <DownloadButton size="sm" href={`/api/exams/${examId}/report.pdf`} fallbackName="exam-summary.pdf">
          Download summary PDF
        </DownloadButton>
      </div>

      {/* Stats strip */}
      <Card className="grid grid-cols-2 divide-y sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        {[
          { label: "Submitted", value: data.submittedAttempts, sub: "attempts" },
          {
            label: "Average",
            value: data.averageScore ?? "—",
            sub: avgPct !== null ? `of ${data.totalMarks} · ${avgPct}%` : `of ${data.totalMarks}`,
          },
          { label: "Highest", value: data.highestScore ?? "—", sub: `of ${data.totalMarks}` },
          { label: "Lowest", value: data.lowestScore ?? "—", sub: `of ${data.totalMarks}` },
        ].map((st) => (
          <div key={st.label} className="px-5 py-4">
            <p className="text-muted-foreground text-xs">{st.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{st.value}</p>
            <p className="text-muted-foreground text-xs">{st.sub}</p>
          </div>
        ))}
      </Card>

      {/* Chart */}
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">Question performance</h3>
            <p className="text-muted-foreground text-sm">Average score and skip rate per question.</p>
          </div>
          <ul className="text-muted-foreground flex gap-4 text-xs">
            <li className="flex items-center gap-1.5">
              <span className="bg-primary h-2.5 w-2.5 rounded-[3px]" aria-hidden="true" />
              Average score
            </li>
            <li className="flex items-center gap-1.5">
              <span className="bg-warning h-2.5 w-2.5 rounded-[3px]" aria-hidden="true" />
              Skipped
            </li>
          </ul>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={3} barCategoryGap="28%" margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                dy={6}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                unit="%"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="bg-card shadow-elev-3 rounded-md border px-3 py-2 text-xs">
                      <p className="mb-1 font-semibold">{label}</p>
                      {payload.map((p) => (
                        <p key={String(p.dataKey)} className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-[2px]"
                            style={{ background: String(p.color) }}
                            aria-hidden="true"
                          />
                          <span className="text-muted-foreground">{p.name}</span>
                          <span className="ml-auto pl-3 font-medium tabular-nums">{p.value}%</span>
                        </p>
                      ))}
                    </div>
                  ) : null
                }
              />
              <Bar dataKey="accuracy" name="Average score" fill="var(--primary)" radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Bar dataKey="skipRate" name="Skipped" fill="var(--warning)" radius={[3, 3, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Per-question table */}
      <Table>
        <THead>
          <TR>
            <TH>Question</TH>
            <TH>Difficulty</TH>
            <TH>Full credit</TH>
            <TH>Skipped</TH>
            <TH className="min-w-64">Answers chosen</TH>
          </TR>
        </THead>
        <TBody>
          {data.questions.map((q) => (
            <TR key={q.questionId}>
              <TD className="max-w-xs align-top">
                <p className="line-clamp-2 font-medium">
                  <span className="text-muted-foreground font-normal">Q{q.position + 1}</span> {q.body}
                </p>
                <p className="text-muted-foreground text-xs">
                  {q.topicName} · {TYPE_LABEL[q.type]} · {q.marks} pts
                </p>
              </TD>
              <TD className="align-top">
                <p className="text-sm">
                  {DIFFICULTY_LABEL[q.declaredDifficulty]}
                  {q.observedDifficulty && q.observedDifficulty !== q.declaredDifficulty && (
                    <span className="text-muted-foreground"> → {DIFFICULTY_LABEL[q.observedDifficulty]}</span>
                  )}
                </p>
                {q.difficultyMismatch && (
                  <p className="text-warning mt-0.5 inline-flex items-center gap-1 text-xs">
                    <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                    Plays harder/easier than set
                  </p>
                )}
              </TD>
              <TD className="align-top">
                <p className="font-semibold tabular-nums">{q.percentCorrect}%</p>
                <div className="bg-muted mt-1 h-1 w-16 overflow-hidden rounded-full" aria-hidden="true">
                  <div className="bg-primary h-full" style={{ width: `${q.percentCorrect}%` }} />
                </div>
                <p className="text-muted-foreground mt-1 text-xs">avg {q.avgScorePct}%</p>
              </TD>
              <TD className={`align-top tabular-nums ${q.skipRate >= 20 ? "text-warning font-medium" : ""}`}>
                {q.skipRate}%
              </TD>
              <TD className="align-top">
                {q.type === "WRITTEN" ? (
                  <span className="text-muted-foreground text-xs">Written response</span>
                ) : (
                  <ul className="space-y-1.5">
                    {q.optionDistribution.map((o) => {
                      const topWrong = !o.isCorrect && o.body === q.mostCommonWrong;
                      return (
                        <li key={o.optionId} className="text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`truncate ${o.isCorrect ? "text-success font-medium" : topWrong ? "text-destructive" : "text-muted-foreground"}`}>
                              {o.isCorrect ? "✓ " : ""}
                              {o.body}
                            </span>
                            <span className="text-muted-foreground shrink-0 tabular-nums">
                              {o.percent}% · {o.count}
                            </span>
                          </div>
                          <div className="bg-muted mt-0.5 h-1 overflow-hidden rounded-full" aria-hidden="true">
                            <div
                              className={`h-full ${o.isCorrect ? "bg-success" : topWrong ? "bg-destructive" : "bg-muted-foreground/40"}`}
                              style={{ width: `${o.percent}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
