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
import { AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Skeleton } from "@/components/ui/misc";
import { EmptyState, StatCard } from "@/components/ui/blocks";
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Computed from <b>{data.submittedAttempts}</b> submitted real
          attempt(s). Sandbox attempts are excluded.
        </p>
        <Button asChild size="sm" variant="outline">
          <a href={`/api/exams/${examId}/report.pdf`} download>
            <Download className="h-4 w-4" />
            Download summary PDF
          </a>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Submitted" value={data.submittedAttempts} />
        <StatCard
          label="Average score"
          value={
            data.averageScore !== null
              ? `${data.averageScore} / ${data.totalMarks}`
              : "—"
          }
        />
        <StatCard label="Highest" value={data.highestScore ?? "—"} />
        <StatCard label="Lowest" value={data.lowestScore ?? "—"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Per-question average score % vs skip rate %
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis domain={[0, 100]} unit="%" fontSize={12} />
                <Tooltip />
                <Bar
                  dataKey="accuracy"
                  name="Avg score %"
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="skipRate"
                  name="Skip rate %"
                  fill="var(--warning)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Table>
        <THead>
          <TR>
            <TH>Question</TH>
            <TH>Declared vs Observed</TH>
            <TH>% Full credit</TH>
            <TH>Skip rate</TH>
            <TH>Most common wrong / Distribution</TH>
          </TR>
        </THead>
        <TBody>
          {data.questions.map((q) => (
            <TR key={q.questionId}>
              <TD className="max-w-xs">
                <p className="line-clamp-2 font-medium">
                  Q{q.position + 1}. {q.body}
                </p>
                <p className="text-muted-foreground text-xs">
                  {q.topicName} · {TYPE_LABEL[q.type]} · {q.marks} pts
                </p>
              </TD>
              <TD>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge>{DIFFICULTY_LABEL[q.declaredDifficulty]}</Badge>
                  {q.observedDifficulty && (
                    <span className="text-muted-foreground text-xs">
                      → {DIFFICULTY_LABEL[q.observedDifficulty]}
                    </span>
                  )}
                </div>
                {q.difficultyMismatch && (
                  <p className="text-warning mt-1 inline-flex items-center gap-1 text-xs">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Difficulty mismatch
                  </p>
                )}
              </TD>
              <TD>
                <b>{q.percentCorrect}%</b>
                <p className="text-muted-foreground text-xs">
                  avg {q.avgScorePct}%
                </p>
              </TD>
              <TD>{q.skipRate}%</TD>
              <TD className="max-w-xs text-xs">
                {q.type === "WRITTEN" ? (
                  <span className="text-muted-foreground">
                    Written response
                  </span>
                ) : (
                  <div className="space-y-1">
                    {q.mostCommonWrong && (
                      <p className="text-destructive">
                        Top wrong: <b>{q.mostCommonWrong}</b>
                      </p>
                    )}
                    <ul className="text-muted-foreground space-y-0.5">
                      {q.optionDistribution.map((o) => (
                        <li key={o.optionId} className="truncate">
                          {o.isCorrect ? "✓ " : "· "}
                          {o.body}: <b>{o.percent}%</b> ({o.count})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
