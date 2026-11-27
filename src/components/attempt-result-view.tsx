"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Check, X } from "lucide-react";
import { DownloadButton } from "@/components/ui/download-button";
import { BackButton } from "@/components/ui/back-button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";
import { EmptyState } from "@/components/ui/blocks";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { TYPE_LABEL } from "@/shared/schemas/question";
import type {
  CandidateResultQuestion,
  CandidateResultView,
} from "@/shared/schemas/grading";

type Outcome = "full" | "partial" | "wrong" | "skipped" | "pending";

function outcomeOf(q: CandidateResultQuestion): Outcome {
  const answered =
    q.selectedOptionIds.length > 0 || (q.textAnswer?.trim().length ?? 0) > 0;
  if (!answered) return "skipped";
  if (q.score === null) return "pending";
  if (q.score >= q.marks) return "full";
  if (q.score > 0) return "partial";
  return "wrong";
}

// Status is carried by colour on text and a thin edge bar, not by badges.
const OUTCOME: Record<Outcome, { label: string; text: string; bar: string }> = {
  full: { label: "Full marks", text: "text-success", bar: "bg-success" },
  partial: { label: "Partial credit", text: "text-warning", bar: "bg-warning" },
  wrong: { label: "Incorrect", text: "text-destructive", bar: "bg-destructive" },
  skipped: { label: "Not answered", text: "text-muted-foreground", bar: "bg-border" },
  pending: { label: "Being graded", text: "text-primary", bar: "bg-primary" },
};

const FILTERS: { key: Outcome | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "full", label: "Full marks" },
  { key: "partial", label: "Partial" },
  { key: "wrong", label: "Incorrect" },
  { key: "skipped", label: "Not answered" },
];

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function AttemptResultView({ attemptId }: { attemptId: string }) {
  const [filter, setFilter] = useState<Outcome | "all">("all");
  const query = useQuery({
    queryKey: ["attempt-result", attemptId],
    queryFn: () => api<CandidateResultView>(`/api/attempts/${attemptId}/result`),
  });

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="space-y-4">
        <BackButton href="/dashboard" label="Dashboard" />
        <EmptyState title="Result unavailable" text={query.error.message} />
      </div>
    );
  }

  const r = query.data;
  const outcomes = r.questions.map(outcomeOf);
  const tally = (o: Outcome) => outcomes.filter((x) => x === o).length;
  const shown = r.questions.filter((_, i) => filter === "all" || outcomes[i] === filter);

  // Score bar segments: marks earned on full-credit vs partial-credit questions.
  const earned = (o: Outcome) =>
    r.questions.reduce((n, q, i) => (outcomes[i] === o ? n + (q.score ?? 0) : n), 0);
  const fullPct = (earned("full") / Math.max(1, r.totalMarks)) * 100;
  const partialPct = (earned("partial") / Math.max(1, r.totalMarks)) * 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackButton href="/dashboard" label="Dashboard" />
        <DownloadButton
          href={`/api/attempts/${r.attemptId}/report.pdf`}
          fallbackName="result-report.pdf"
        >
          Download verifiable PDF
        </DownloadButton>
      </div>

      {/* Summary */}
      <Card className="animate-page-in p-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{r.examTitle}</h1>
          <p className="text-muted-foreground text-sm">
            {r.candidateName} · Submitted {format(new Date(r.submittedAt), "MMM d, yyyy, p")} ·
            Published {format(new Date(r.resultsPublishedAt), "MMM d, yyyy")}
          </p>
        </div>

        <div className="mt-6 grid gap-6 border-t pt-6 sm:grid-cols-[auto_1fr] sm:items-end sm:gap-10">
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Score</p>
            <p className="mt-1 leading-none">
              <span className="text-5xl font-semibold tracking-tight tabular-nums">{fmt(r.totalScore)}</span>
              <span className="text-muted-foreground text-xl tabular-nums"> / {fmt(r.totalMarks)}</span>
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-2xl font-semibold tabular-nums">{r.percentage}%</span>
              <span className="text-muted-foreground tabular-nums">
                {tally("full")} of {r.questions.length} questions at full marks
              </span>
            </div>
            <div
              className="bg-muted flex h-2 overflow-hidden rounded-full"
              role="img"
              aria-label={`${r.percentage}% scored`}
            >
              <div className="bg-success h-full transition-[width] duration-700" style={{ width: `${fullPct}%` }} />
              <div className="bg-warning h-full transition-[width] duration-700" style={{ width: `${partialPct}%` }} />
            </div>
            <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="bg-success h-2 w-2 rounded-sm" aria-hidden="true" />
                Full marks {tally("full")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="bg-warning h-2 w-2 rounded-sm" aria-hidden="true" />
                Partial {tally("partial")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="bg-destructive h-2 w-2 rounded-sm" aria-hidden="true" />
                Incorrect {tally("wrong")}
              </span>
              {tally("skipped") > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="bg-border h-2 w-2 rounded-sm" aria-hidden="true" />
                  Not answered {tally("skipped")}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Breakdown */}
      <section className="space-y-4" aria-labelledby="breakdown-heading">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b">
          <h2 id="breakdown-heading" className="pb-2.5 text-lg font-semibold tracking-tight">
            Question breakdown
          </h2>
          <div className="-mb-px flex gap-1 overflow-x-auto" role="tablist" aria-label="Filter questions">
            {FILTERS.filter((f) => f.key === "all" || tally(f.key as Outcome) > 0).map((f) => {
              const on = filter === f.key;
              const count = f.key === "all" ? r.questions.length : tally(f.key as Outcome);
              return (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "border-b-2 px-3 pb-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                    on
                      ? "border-primary text-foreground"
                      : "text-muted-foreground hover:text-foreground border-transparent",
                  )}
                >
                  {f.label} <span className="text-muted-foreground font-normal tabular-nums">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <ol className="stagger space-y-3">
          {shown.map((q) => {
            const o = OUTCOME[outcomeOf(q)];
            return (
              <li key={q.attemptQuestionId}>
                <Card className="relative overflow-hidden">
                  <span className={cn("absolute inset-y-0 left-0 w-[3px]", o.bar)} aria-hidden="true" />
                  <div className="space-y-4 p-5 pl-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-1">
                        <p className="text-muted-foreground text-xs">
                          Question {q.position + 1} · {TYPE_LABEL[q.type]} · {q.marks} mark{q.marks === 1 ? "" : "s"}
                        </p>
                        <p className="font-medium leading-relaxed">{q.body}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg leading-none font-semibold tabular-nums">
                          {q.score === null ? "–" : fmt(q.score)}
                          <span className="text-muted-foreground text-sm font-normal"> / {fmt(q.marks)}</span>
                        </p>
                        <p className={cn("mt-1 text-xs font-medium", o.text)}>{o.label}</p>
                      </div>
                    </div>

                    {q.type === "WRITTEN" ? (
                      <div className="border-l-2 pl-4">
                        <p className="text-muted-foreground mb-1 text-xs">Your answer</p>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {q.textAnswer?.trim() || (
                            <span className="text-muted-foreground italic">No answer provided.</span>
                          )}
                        </p>
                      </div>
                    ) : (
                      <ul className="divide-y rounded-md border">
                        {q.options.map((opt) => {
                          const picked = q.selectedOptionIds.includes(opt.id);
                          const right = opt.isCorrect === true;
                          const wrongPick = picked && opt.isCorrect === false;
                          return (
                            <li
                              key={opt.id}
                              className={cn(
                                "flex items-center gap-3 px-3.5 py-2.5 text-sm",
                                right && "bg-success/6",
                                wrongPick && "bg-destructive/5",
                              )}
                            >
                              <span className="flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden="true">
                                {right ? (
                                  <Check className="text-success h-4 w-4" strokeWidth={2.75} />
                                ) : wrongPick ? (
                                  <X className="text-destructive h-4 w-4" strokeWidth={2.75} />
                                ) : (
                                  <span
                                    className={cn(
                                      "h-3 w-3 rounded-full border-[1.5px]",
                                      picked ? "border-primary bg-primary" : "border-muted-foreground/40",
                                    )}
                                  />
                                )}
                              </span>
                              <span className={cn("flex-1", right && "font-medium")}>{opt.body}</span>
                              {picked && <span className="text-muted-foreground text-xs">Your answer</span>}
                              {right && !picked && <span className="text-success text-xs">Correct answer</span>}
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {q.feedback && (
                      <div className="bg-muted/60 rounded-md px-3.5 py-3 text-sm">
                        <p className="text-muted-foreground mb-0.5 text-xs font-medium">Examiner feedback</p>
                        <p className="leading-relaxed">{q.feedback}</p>
                      </div>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
