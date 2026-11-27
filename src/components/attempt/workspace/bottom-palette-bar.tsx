"use client";
import { Button } from "@/components/ui/button";
import type { AttemptQuestionPublic } from "@/shared/schemas/attempt";
import { isAnswered, type DraftAnswer } from "./draft-answer";
import { PaletteTile } from "./palette-tile";

/** Fixed bottom question navigator (the "Bottom bar" preference). */
export function BottomPaletteBar({
  questions,
  drafts,
  activeIndex,
  onSelect,
  onReview,
}: {
  questions: AttemptQuestionPublic[];
  drafts: Record<string, DraftAnswer>;
  activeIndex: number | null;
  onSelect: (index: number) => void;
  onReview: () => void;
}) {
  return (
    <nav
      aria-label="Question navigation"
      className="bg-card shadow-elev-3 fixed inset-x-0 bottom-0 z-30 border-t"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
        <div className="flex flex-1 gap-1.5 overflow-x-auto py-1">
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
                className="min-w-9 shrink-0 px-2"
              />
            );
          })}
        </div>
        <Button size="sm" onClick={onReview}>
          Review &amp; submit
        </Button>
      </div>
    </nav>
  );
}
