"use client";
import { Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import type { DrawResult } from "@/lib/api";
import type { QuestionListItem } from "@/shared/schemas/question";
import { QuestionMeta } from "./question-meta";

/** "Random by rules" mode, after drawing: preview, redraw, or add the result. */
export function DrawnQuestionsPreview({
  drawn,
  drawing,
  onEditRules,
  onDrawAgain,
  onCommit,
}: {
  drawn: DrawResult;
  drawing: boolean;
  onEditRules: () => void;
  onDrawAgain: () => void;
  onCommit: (items: QuestionListItem[]) => void;
}) {
  const shortfall = drawn.results.some((r) => r.got < r.wanted);
  return (
    <>
      <div className="space-y-1">
        <p className="text-sm font-medium">
          Drew {drawn.items.length} of{" "}
          {drawn.results.reduce((s, r) => s + r.wanted, 0)} questions
        </p>
        {shortfall && (
          <p className="text-muted-foreground text-xs">
            Some rules had fewer matching questions than requested, so they drew
            everything available.
          </p>
        )}
      </div>
      {drawn.items.length === 0 ? (
        <p className="text-muted-foreground rounded-md border p-6 text-center text-sm">
          No unused questions match these rules.
        </p>
      ) : (
        <ul className="max-h-[46vh] divide-y overflow-y-auto rounded-md border">
          {drawn.items.map((q, i) => (
            <li key={q.id} className="flex items-start gap-3 px-3 py-2.5">
              <span className="text-muted-foreground w-5 shrink-0 pt-px text-right text-xs tabular-nums">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-sm font-medium">
                  {q.body}
                </span>
                <QuestionMeta q={q} />
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <Button variant="ghost" onClick={onEditRules}>
          Edit rules
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" disabled={drawing} onClick={onDrawAgain}>
            {drawing ? <Spinner /> : <RotateCcw className="h-4 w-4" />}
            Draw again
          </Button>
          <Button
            disabled={drawn.items.length === 0}
            onClick={() => onCommit(drawn.items)}
          >
            <Plus className="h-4 w-4" />
            Add {drawn.items.length} question
            {drawn.items.length === 1 ? "" : "s"}
          </Button>
        </div>
      </div>
    </>
  );
}
