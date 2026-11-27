"use client";
import type { AttemptQuestionPublic } from "@/shared/schemas/attempt";
import { isAnswered, type AnswerCounts, type DraftAnswer } from "./draft-answer";
import { PaletteTile } from "./palette-tile";

/** Progress bar, question tile grid and legend (side panel and mobile dialog). */
export function QuestionPalette({
  questions,
  drafts,
  counts,
  activeIndex,
  onSelect,
}: {
  questions: AttemptQuestionPublic[];
  drafts: Record<string, DraftAnswer>;
  counts: AnswerCounts;
  /** Highlighted tile, or null while the review screen is showing. */
  activeIndex: number | null;
  onSelect: (index: number) => void;
}) {
  const progressPct = Math.round(
    (counts.answered / Math.max(1, questions.length)) * 100,
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold">Questions</span>
          <span className="text-muted-foreground text-xs tabular-nums">
            <span className="text-foreground font-semibold">
              {counts.answered}
            </span>
            /{questions.length} answered
          </span>
        </div>
        <div
          className="bg-muted h-1.5 overflow-hidden rounded-full"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Answered"
        >
          <div
            className="bg-primary h-full rounded-full transition-[width] duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {questions.map((q, i) => {
          const d = drafts[q.id];
          return (
            <PaletteTile
              key={q.id}
              index={i}
              answered={isAnswered(d)}
              flagged={!!d?.markedForReview}
              active={i === activeIndex}
              onSelect={() => onSelect(i)}
            />
          );
        })}
      </div>

      <ul className="text-muted-foreground grid grid-cols-2 gap-x-3 gap-y-1.5 border-t pt-3 text-xs">
        <li className="flex items-center gap-2">
          <span
            className="border-primary/50 bg-primary/10 h-3 w-3 rounded-[3px] border"
            aria-hidden="true"
          />
          Answered
        </li>
        <li className="flex items-center gap-2">
          <span
            className="border-foreground/25 bg-card h-3 w-3 rounded-[3px] border border-dashed"
            aria-hidden="true"
          />
          Not answered
        </li>
        <li className="flex items-center gap-2">
          <span
            className="bg-primary h-3 w-3 rounded-[3px]"
            aria-hidden="true"
          />
          Current
        </li>
        <li className="flex items-center gap-2">
          <span
            className="bg-warning h-2 w-2 rounded-full"
            aria-hidden="true"
          />
          Flagged ({counts.flagged})
        </li>
      </ul>
    </div>
  );
}
