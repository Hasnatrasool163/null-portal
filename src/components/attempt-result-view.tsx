"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Skeleton } from "@/components/ui/misc";
import { EmptyState, PageHeader, StatCard } from "@/components/ui/blocks";
import { api } from "@/lib/api-client";
import { TYPE_LABEL } from "@/shared/schemas/question";
import type { CandidateResultView } from "@/shared/schemas/grading";

export function AttemptResultView({ attemptId }: { attemptId: string }) {
  const query = useQuery({
    queryKey: ["attempt-result", attemptId],
    queryFn: () =>
      api<CandidateResultView>(`/api/attempts/${attemptId}/result`),
  });

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <EmptyState
        title="Result unavailable"
        text={query.error.message}
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to home</Link>
          </Button>
        }
      />
    );
  }

  const r = query.data;
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </Link>
        <PageHeader
          title={r.examTitle}
          subtitle={`${r.candidateName} · Submitted ${format(new Date(r.submittedAt), "PP p")}`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Score" value={`${r.totalScore} / ${r.totalMarks}`} />
        <StatCard label="Percentage" value={`${r.percentage}%`} />
        <StatCard
          label="Published"
          value={format(new Date(r.resultsPublishedAt), "PP")}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Question breakdown</h2>
        {r.questions.map((q) => (
          <Card key={q.attemptQuestionId}>
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
              <div>
                <CardTitle className="text-base">
                  Q{q.position + 1}. {q.body}
                </CardTitle>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {TYPE_LABEL[q.type]} · {q.marks} marks
                </p>
              </div>
              <Badge
                className={
                  (q.score ?? 0) >= q.marks
                    ? "bg-success/15 text-success shrink-0"
                    : (q.score ?? 0) > 0
                      ? "bg-warning/15 text-warning shrink-0"
                      : "bg-muted text-muted-foreground shrink-0"
                }
              >
                {q.score ?? 0} / {q.marks}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {q.type === "WRITTEN" ? (
                <div className="bg-muted/60 rounded-md p-3 whitespace-pre-wrap">
                  {q.textAnswer && q.textAnswer.trim().length > 0 ? (
                    q.textAnswer
                  ) : (
                    <span className="text-muted-foreground italic">
                      No answer provided.
                    </span>
                  )}
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {q.options.map((o) => {
                    const picked = q.selectedOptionIds.includes(o.id);
                    const isRight = o.isCorrect === true;
                    const isWrongPick = picked && o.isCorrect === false;
                    return (
                      <li
                        key={o.id}
                        className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${
                          isRight
                            ? "border-success/40 bg-success/10"
                            : isWrongPick
                              ? "border-destructive/40 bg-destructive/10"
                              : picked
                                ? "border-primary bg-accent/50"
                                : "border-border"
                        }`}
                      >
                        {isRight ? (
                          <CheckCircle2 className="text-success h-4 w-4 shrink-0" />
                        ) : isWrongPick ? (
                          <XCircle className="text-destructive h-4 w-4 shrink-0" />
                        ) : (
                          <span className="text-muted-foreground w-4 text-center text-xs">
                            {picked ? "●" : "○"}
                          </span>
                        )}
                        <span className="flex-1">{o.body}</span>
                        {picked && (
                          <span className="text-muted-foreground text-xs">
                            Your choice
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {q.feedback && (
                <p className="bg-accent/60 rounded-md p-2.5 text-xs">
                  <b>Examiner feedback:</b> {q.feedback}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
