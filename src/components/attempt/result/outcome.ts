import type {
  CandidateResultQuestion,
  CandidateResultView,
} from "@/shared/schemas/grading";

/** How a single question turned out for the candidate. */
export type Outcome = "full" | "partial" | "wrong" | "skipped" | "pending";
export type OutcomeFilter = Outcome | "all";

export function outcomeOf(q: CandidateResultQuestion): Outcome {
  const answered =
    q.selectedOptionIds.length > 0 || (q.textAnswer?.trim().length ?? 0) > 0;
  if (!answered) return "skipped";
  if (q.score === null) return "pending";
  if (q.score >= q.marks) return "full";
  if (q.score > 0) return "partial";
  return "wrong";
}

// Status is carried by colour on text and a thin edge bar, not by badges.
export const OUTCOME: Record<
  Outcome,
  { label: string; text: string; bar: string }
> = {
  full: { label: "Full marks", text: "text-success", bar: "bg-success" },
  partial: { label: "Partial credit", text: "text-warning", bar: "bg-warning" },
  wrong: {
    label: "Incorrect",
    text: "text-destructive",
    bar: "bg-destructive",
  },
  skipped: {
    label: "Not answered",
    text: "text-muted-foreground",
    bar: "bg-border",
  },
  pending: { label: "Being graded", text: "text-primary", bar: "bg-primary" },
};

export const OUTCOME_FILTERS: { key: OutcomeFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "full", label: "Full marks" },
  { key: "partial", label: "Partial" },
  { key: "wrong", label: "Incorrect" },
  { key: "skipped", label: "Not answered" },
];

/** Per-question outcomes plus the aggregates the summary and breakdown render. */
export function summarizeOutcomes(r: CandidateResultView) {
  const outcomes = r.questions.map(outcomeOf);
  const tally = (o: Outcome) => outcomes.filter((x) => x === o).length;

  // Score bar segments: marks earned on full-credit vs partial-credit questions.
  const earned = (o: Outcome) =>
    r.questions.reduce(
      (n, q, i) => (outcomes[i] === o ? n + (q.score ?? 0) : n),
      0,
    );
  const fullPct = (earned("full") / Math.max(1, r.totalMarks)) * 100;
  const partialPct = (earned("partial") / Math.max(1, r.totalMarks)) * 100;

  return { outcomes, tally, fullPct, partialPct };
}

export type OutcomeSummary = ReturnType<typeof summarizeOutcomes>;
