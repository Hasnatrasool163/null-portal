"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CalendarCheck,
  Check,
  Clock,
  MessageSquareText,
  Minus,
  User,
  X,
} from "lucide-react";
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

const OUTCOME: Record<Outcome, { label: string; pill: string }> = {
  full: { label: "Full marks", pill: "bg-success/12 text-success" },
  partial: { label: "Partial", pill: "bg-warning/12 text-warning" },
  wrong: { label: "Incorrect", pill: "bg-destructive/10 text-destructive" },
  skipped: { label: "Not answered", pill: "bg-muted text-muted-foreground" },
  pending: { label: "Being graded", pill: "bg-accent text-accent-foreground" },
};

const FILTERS: { key: Outcome | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "full", label: "Full marks" },
  { key: "partial", label: "Partial" },
  { key: "wrong", label: "Incorrect" },
  { key: "skipped", label: "Not answered" },
];

function Pill({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Circular score gauge. Pure SVG, no chart library. */
function ScoreRing({ pct }: { pct: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const tone =
    clamped >= 75 ? "text-success" : clamped >= 50 ? "text-primary" : "text-warning";
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" className="stroke-muted" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          stroke="currentColor"
          className={cn(tone, "transition-[stroke-dashoffset] duration-700 ease-out")}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{clamped}%</span>
        <span className="text-muted-foreground text-[11px]">score</span>
      </div>
    </div>
  );
}

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
        <Skeleton className="h-40 w-full" />
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
      <Card className="animate-page-in flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-3">
          <Pill className="bg-success/12 text-success">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Result published
          </Pill>
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-[28px]">
            {r.examTitle}
          </h1>
          <ul className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
            <li className="flex items-center gap-1.5">
              <User className="h-4 w-4" aria-hidden="true" />
              {r.candidateName}
            </li>
            <li className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" aria-hidden="true" />
              Submitted {format(new Date(r.submittedAt), "MMM d, yyyy · p")}
            </li>
            <li className="flex items-center gap-1.5">
              <CalendarCheck className="h-4 w-4" aria-hidden="true" />
              Published {format(new Date(r.resultsPublishedAt), "MMM d, yyyy")}
            </li>
          </ul>
        </div>
        <div className="flex items-center gap-5 sm:border-l sm:pl-6">
          <ScoreRing pct={r.percentage} />
          <div>
            <p className="text-muted-foreground text-xs">Marks</p>
            <p className="text-3xl font-semibold tracking-tight tabular-nums">
              {r.totalScore}
              <span className="text-muted-foreground text-lg font-normal"> / {r.totalMarks}</span>
            </p>
          </div>
        </div>
      </Card>

      {/* Breakdown */}
      <section className="space-y-4" aria-labelledby="breakdown-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="breakdown-heading" className="text-lg font-semibold tracking-tight">
              Question breakdown
            </h2>
            <p className="text-muted-foreground text-sm">
              {tally("full")} full marks · {tally("partial")} partial · {tally("wrong")} incorrect
              {tally("skipped") > 0 && ` · ${tally("skipped")} not answered`}
            </p>
          </div>
          <div className="bg-muted flex flex-wrap gap-1 rounded-lg p-1" role="tablist" aria-label="Filter questions">
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
                    "h-8 rounded-md px-3 text-xs font-medium transition-[background-color,color,box-shadow]",
                    on ? "bg-card text-foreground shadow-elev-1" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.label} <span className="text-muted-foreground tabular-nums">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <ol className="stagger space-y-3">
          {shown.map((q) => {
            const o = outcomeOf(q);
            return (
              <li key={q.attemptQuestionId}>
                <Card className="space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Pill className="bg-foreground text-background font-mono">
                          Q{q.position + 1}
                        </Pill>
                        <Pill className="bg-muted text-muted-foreground">{TYPE_LABEL[q.type]}</Pill>
                      </div>
                      <p className="font-medium leading-relaxed">{q.body}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Pill className={OUTCOME[o].pill}>{OUTCOME[o].label}</Pill>
                      <span className="text-sm font-semibold tabular-nums">
                        {q.score ?? "–"}
                        <span className="text-muted-foreground font-normal"> / {q.marks}</span>
                      </span>
                    </div>
                  </div>

                  {q.type === "WRITTEN" ? (
                    <div className="bg-muted/60 rounded-md p-3 text-sm leading-relaxed whitespace-pre-wrap">
                      {q.textAnswer?.trim() ? (
                        q.textAnswer
                      ) : (
                        <span className="text-muted-foreground italic">No answer provided.</span>
                      )}
                    </div>
                  ) : (
                    <ul className="space-y-1.5">
                      {q.options.map((opt) => {
                        const picked = q.selectedOptionIds.includes(opt.id);
                        const right = opt.isCorrect === true;
                        const wrongPick = picked && opt.isCorrect === false;
                        return (
                          <li
                            key={opt.id}
                            className={cn(
                              "flex items-center gap-3 rounded-md border px-3 py-2 text-sm",
                              right
                                ? "border-success/30 bg-success/8"
                                : wrongPick
                                  ? "border-destructive/30 bg-destructive/6"
                                  : picked
                                    ? "border-primary/40 bg-accent/50"
                                    : "border-border",
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                                right
                                  ? "bg-success text-white"
                                  : wrongPick
                                    ? "bg-destructive text-white"
                                    : picked
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted text-muted-foreground",
                              )}
                              aria-hidden="true"
                            >
                              {right ? (
                                <Check className="h-3 w-3" strokeWidth={3} />
                              ) : wrongPick ? (
                                <X className="h-3 w-3" strokeWidth={3} />
                              ) : picked ? (
                                <Check className="h-3 w-3" strokeWidth={3} />
                              ) : (
                                <Minus className="h-3 w-3" />
                              )}
                            </span>
                            <span className="flex-1">{opt.body}</span>
                            {picked && (
                              <Pill className="bg-card text-muted-foreground border text-[11px]">
                                Your answer
                              </Pill>
                            )}
                            {right && !picked && (
                              <Pill className="text-success text-[11px]">Correct answer</Pill>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {q.feedback && (
                    <div className="bg-accent/60 text-accent-foreground flex gap-2.5 rounded-md p-3 text-sm">
                      <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <p>
                        <span className="font-medium">Examiner feedback · </span>
                        {q.feedback}
                      </p>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
