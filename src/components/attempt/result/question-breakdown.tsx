"use client";
import { useState } from "react";
import { UnderlineTabs } from "@/components/ui/underline-tabs";
import type { CandidateResultQuestion } from "@/shared/schemas/grading";
import {
  OUTCOME_FILTERS,
  type Outcome,
  type OutcomeFilter,
  type OutcomeSummary,
} from "./outcome";
import { QuestionResultCard } from "./question-result-card";

/** "Question breakdown" section: outcome filter tabs over the per-question cards. */
export function QuestionBreakdown({
  questions,
  summary: { outcomes, tally },
  canDispute,
  onDispute,
}: {
  questions: CandidateResultQuestion[];
  summary: OutcomeSummary;
  canDispute: (q: CandidateResultQuestion) => boolean;
  onDispute: (attemptQuestionId: string) => void;
}) {
  const [filter, setFilter] = useState<OutcomeFilter>("all");
  const shown = questions
    .map((q, i) => ({ q, outcome: outcomes[i] }))
    .filter(({ outcome }) => filter === "all" || outcome === filter);

  return (
    <section className="space-y-4" aria-labelledby="breakdown-heading">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h2
          id="breakdown-heading"
          className="pb-2.5 text-lg font-semibold tracking-tight"
        >
          Question breakdown
        </h2>
      </div>
      <UnderlineTabs
        label="Filter questions"
        value={filter}
        onChange={setFilter}
        tabs={OUTCOME_FILTERS.filter(
          (f) => f.key === "all" || tally(f.key as Outcome) > 0,
        ).map((f) => ({
          id: f.key,
          label: f.label,
          count: f.key === "all" ? questions.length : tally(f.key as Outcome),
        }))}
      />

      <ol className="stagger space-y-3">
        {shown.map(({ q, outcome }) => (
          <li key={q.attemptQuestionId}>
            <QuestionResultCard
              question={q}
              outcome={outcome}
              onDispute={
                canDispute(q) ? () => onDispute(q.attemptQuestionId) : undefined
              }
            />
          </li>
        ))}
      </ol>
    </section>
  );
}
