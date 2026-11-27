"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/format";
import { MULTI_LABEL, type ExamDetail } from "@/shared/schemas/exam";

export type ConfirmAction = "publish" | "close";

/** What publishing will lock, shown in the confirmation dialog. */
function PublishSummary({ exam }: { exam: ExamDetail }) {
  const rows: [string, string][] = [
    [
      "Window",
      `${formatDateTime(exam.startsAt)} – ${formatDateTime(exam.endsAt)}`,
    ],
    ["Duration", `${exam.durationMinutes} min`],
    ["Questions", `${exam.questionCount} · ${exam.totalMarks} marks`],
    ["Candidates", String(exam.enrollmentCount)],
    [
      "Scoring",
      `${MULTI_LABEL[exam.multiScoring]}${exam.negativeMarking > 0 ? `, −${exam.negativeMarking * 100}% per wrong answer` : ""}`,
    ],
    [
      "Order",
      `${exam.shuffleQuestions ? "Shuffled" : "Fixed"} questions, ${exam.shuffleOptions ? "shuffled" : "fixed"} options`,
    ],
  ];
  return (
    <dl className="mb-5 divide-y rounded-md border text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[6.5rem_1fr] gap-3 px-3 py-2.5">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Confirmation step before publishing or closing an exam. */
export function ExamConfirmDialog({
  exam,
  action,
  pending,
  onCancel,
  onConfirm,
}: {
  exam: ExamDetail;
  action: ConfirmAction | null;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (action: ConfirmAction) => void;
}) {
  return (
    <Dialog open={action !== null} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        title={action === "publish" ? "Publish exam?" : "Close exam now?"}
        description={
          action === "publish"
            ? "Check the details below. Publishing locks the questions, marks, schedule and scoring; only the title and instructions stay editable."
            : "Closing prevents any new attempts from starting and moves the exam to Completed."
        }
      >
        {action === "publish" && <PublishSummary exam={exam} />}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant={action === "close" ? "destructive" : "default"}
            disabled={pending}
            onClick={() =>
              onConfirm(action === "publish" ? "publish" : "close")
            }
          >
            {pending && <Spinner />}
            {action === "publish" ? "Publish exam" : "Close exam"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
