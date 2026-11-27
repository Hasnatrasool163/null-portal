import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { formatDate, formatScore } from "@/lib/format";
import type { CandidateResultView } from "@/shared/schemas/grading";
import type { OutcomeSummary } from "./outcome";

/** Headline card: exam title, total score and the full/partial score bar with legend. */
export function ScoreSummaryCard({
  result: r,
  summary: { tally, fullPct, partialPct },
}: {
  result: CandidateResultView;
  summary: OutcomeSummary;
}) {
  return (
    <Card className="animate-page-in p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {r.examTitle}
        </h1>
        <p className="text-muted-foreground text-sm">
          {r.candidateName} · Submitted{" "}
          {/* Not formatDateTime: that renders without the comma before the time. */}
          {format(new Date(r.submittedAt), "MMM d, yyyy, p")} · Published{" "}
          {formatDate(r.resultsPublishedAt)}
        </p>
      </div>

      <div className="mt-6 grid gap-6 border-t pt-6 sm:grid-cols-[auto_1fr] sm:items-end sm:gap-10">
        <div>
          <p className="text-muted-foreground text-xs font-medium">Score</p>
          <p className="mt-1 leading-none">
            <span className="text-5xl font-semibold tracking-tight tabular-nums">
              {formatScore(r.totalScore)}
            </span>
            <span className="text-muted-foreground text-xl tabular-nums">
              {" "}
              / {formatScore(r.totalMarks)}
            </span>
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-2xl font-semibold tabular-nums">
              {r.percentage}%
            </span>
            <span className="text-muted-foreground tabular-nums">
              {tally("full")} of {r.questions.length} questions at full marks
            </span>
          </div>
          <div
            className="bg-muted flex h-2 overflow-hidden rounded-full"
            role="img"
            aria-label={`${r.percentage}% scored`}
          >
            <div
              className="bg-success h-full transition-[width] duration-700"
              style={{ width: `${fullPct}%` }}
            />
            <div
              className="bg-warning h-full transition-[width] duration-700"
              style={{ width: `${partialPct}%` }}
            />
          </div>
          <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1 text-xs">
            <LegendItem dot="bg-success">Full marks {tally("full")}</LegendItem>
            <LegendItem dot="bg-warning">Partial {tally("partial")}</LegendItem>
            <LegendItem dot="bg-destructive">
              Incorrect {tally("wrong")}
            </LegendItem>
            {tally("skipped") > 0 && (
              <LegendItem dot="bg-border">
                Not answered {tally("skipped")}
              </LegendItem>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function LegendItem({
  dot,
  children,
}: {
  dot: string;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`${dot} h-2 w-2 rounded-sm`} aria-hidden="true" />
      {children}
    </span>
  );
}
