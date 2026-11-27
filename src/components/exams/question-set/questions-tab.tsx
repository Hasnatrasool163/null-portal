"use client";
import { useState } from "react";
import { Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { EmptyState } from "@/components/ui/blocks";
import { QuestionPickerDialog } from "@/components/exams/question-picker-dialog";
import { editLevel } from "@/shared/exam-lifecycle";
import type { ExamDetail } from "@/shared/schemas/exam";
import { QuestionSetTable } from "./question-set-table";
import { useQuestionSet } from "./use-question-set";

/** "Questions" tab: assemble, reorder and weight the exam's question set. */
export function QuestionsTab({
  exam,
  readOnly,
}: {
  exam: ExamDetail;
  readOnly: boolean;
}) {
  const locked = readOnly || editLevel(exam) !== "FULL";
  const set = useQuestionSet(exam);
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          <b>{set.items.length}</b> question(s) · Total <b>{set.totalMarks}</b>{" "}
          marks
          {locked && (
            <span className="ml-2 inline-flex items-center gap-1">
              <Lock className="h-3.5 w-3.5" /> Locked after publishing
            </span>
          )}
        </p>
        {!locked && (
          <div className="flex flex-wrap items-center gap-2">
            {set.dirty && (
              <span
                className="text-warning flex items-center gap-1.5 text-xs font-medium"
                role="status"
              >
                <span
                  className="bg-warning h-1.5 w-1.5 rounded-full"
                  aria-hidden="true"
                />
                Unsaved changes
              </span>
            )}
            <Button variant="outline" onClick={() => setPickerOpen(true)}>
              <Plus className="h-4 w-4" />
              Add questions
            </Button>
            <Button
              disabled={!set.dirty || set.save.isPending}
              onClick={() => set.save.mutate()}
            >
              {set.save.isPending && <Spinner />}
              Save question set
            </Button>
          </div>
        )}
      </div>

      {set.items.length === 0 ? (
        <EmptyState
          title="No questions assigned"
          text={
            locked
              ? "This exam has no questions."
              : "Choose questions from your bank, or draw them at random by topic and difficulty."
          }
          action={
            !locked ? (
              <Button onClick={() => setPickerOpen(true)}>
                <Plus className="h-4 w-4" />
                Add questions
              </Button>
            ) : undefined
          }
        />
      ) : (
        <QuestionSetTable
          items={set.items}
          locked={locked}
          onMove={set.move}
          onMarks={set.setMarks}
          onRemove={set.remove}
        />
      )}

      <QuestionPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        assignedIds={set.assignedIds}
        onAdd={set.add}
      />
    </div>
  );
}
