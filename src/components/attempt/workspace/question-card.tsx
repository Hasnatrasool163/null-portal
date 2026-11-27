"use client";
import type { Ref } from "react";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TYPE_LABEL } from "@/shared/schemas/question";
import type { AttemptQuestionPublic } from "@/shared/schemas/attempt";
import {
  toggleFlag,
  toggleOption,
  type DraftAnswer,
  type UpdateDraft,
} from "./draft-answer";
import { ChoiceAnswerField } from "./choice-answer-field";
import { WrittenAnswerField } from "./written-answer-field";

/**
 * One question with its answer input. `single` = one-question-at-a-time
 * layout (card chrome, focusable heading, prev/next footer); otherwise it is
 * a section of the scrolling exam paper.
 */
export function QuestionCard({
  question: q,
  index: i,
  total,
  draft: d,
  single,
  headingRef,
  updateDraft,
  onPrevious,
  onNext,
  onReview,
}: {
  question: AttemptQuestionPublic;
  index: number;
  total: number;
  draft: DraftAnswer;
  single: boolean;
  headingRef?: Ref<HTMLHeadingElement>;
  updateDraft: UpdateDraft;
  onPrevious: () => void;
  onNext: () => void;
  onReview: () => void;
}) {
  return (
    <Card
      id={`q-${i}`}
      data-qindex={i}
      className={
        single
          ? "scroll-mt-24"
          : "scroll-mt-6 rounded-none border-0 bg-transparent shadow-none"
      }
    >
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
        <div>
          <h2
            ref={single ? headingRef : undefined}
            tabIndex={-1}
            className="text-base font-semibold outline-none"
          >
            Question {i + 1} of {total}
          </h2>
          <p className="text-muted-foreground text-xs">
            {TYPE_LABEL[q.type]} · {q.marks} mark
            {q.marks === 1 ? "" : "s"}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant={d.markedForReview ? "secondary" : "outline"}
          onClick={() => updateDraft(q.id, toggleFlag)}
        >
          <Flag
            className={`h-3.5 w-3.5 ${d.markedForReview ? "text-warning fill-current" : ""}`}
          />
          {d.markedForReview ? "Flagged" : "Flag for review"}
        </Button>
      </CardHeader>

      <CardContent className="space-y-5">
        <p className="q-text whitespace-pre-wrap">{q.body}</p>

        {q.type === "WRITTEN" ? (
          <WrittenAnswerField
            questionId={q.id}
            value={d.textAnswer}
            onChange={(val) =>
              updateDraft(q.id, (cur) => ({
                selectedOptionIds: [],
                textAnswer: val,
                markedForReview: cur.markedForReview,
              }))
            }
          />
        ) : (
          <ChoiceAnswerField
            question={q}
            selectedOptionIds={d.selectedOptionIds}
            onToggle={(optionId) =>
              updateDraft(q.id, toggleOption(q.type, optionId))
            }
            onClear={() =>
              updateDraft(q.id, (cur) => ({ ...cur, selectedOptionIds: [] }))
            }
          />
        )}

        {single && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={i === 0}
              onClick={onPrevious}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onReview}>
                Review &amp; submit
              </Button>
              {i < total - 1 && (
                <Button type="button" onClick={onNext}>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
