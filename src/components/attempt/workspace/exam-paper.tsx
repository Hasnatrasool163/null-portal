"use client";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { AnswerCounts } from "./draft-answer";

/** Scrolling layout: every question on one "answer sheet". */
export function ExamPaper({
  examTitle,
  total,
  counts,
  onReview,
  children,
}: {
  examTitle: string;
  total: number;
  counts: AnswerCounts;
  onReview: () => void;
  children: ReactNode;
}) {
  return (
    <article
      aria-label="Exam paper"
      className="bg-card shadow-elev-1 overflow-hidden rounded-lg border"
    >
      <header className="border-b px-5 pt-6 pb-4 sm:px-6">
        <p className="text-muted-foreground font-mono text-[11px]">
          Answer sheet
        </p>
        <p className="font-semibold">{examTitle}</p>
      </header>
      <div className="divide-y divide-dashed">{children}</div>
      <footer className="bg-card/80 flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4 sm:px-6">
        <p className="text-muted-foreground text-sm">
          End of paper · {counts.answered} of {total} answered
          {counts.flagged > 0 && ` · ${counts.flagged} flagged`}
        </p>
        <Button onClick={onReview}>Review &amp; submit</Button>
      </footer>
    </article>
  );
}
