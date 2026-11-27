"use client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/misc";
import { QuestionForm } from "@/components/questions/question-form";
import { questionsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type {
  QuestionDetail,
  QuestionInput,
  Topic,
} from "@/shared/schemas/question";
import type { EditingQuestion } from "@/components/questions/use-question-mutations";

/** The editable subset of a stored question, as the form's initial values. */
function toInput(q: QuestionDetail): QuestionInput {
  return {
    topicId: q.topicId,
    type: q.type,
    difficulty: q.difficulty,
    body: q.body,
    defaultMarks: q.defaultMarks,
    options: q.options.map((o) => ({ body: o.body, isCorrect: o.isCorrect })),
  };
}

/** Create/edit dialog: loads the stored question when editing an existing one. */
export function QuestionEditorDialog({
  editing,
  topics,
  onClose,
  onSubmit,
}: {
  editing: EditingQuestion;
  topics: Topic[] | undefined;
  onClose: () => void;
  onSubmit: (v: QuestionInput) => Promise<void>;
}) {
  const existingId = editing && editing !== "new" ? editing : null;
  const detail = useQuery({
    queryKey: qk.questions.detail(existingId ?? ""),
    queryFn: () => questionsApi.get(existingId!),
    enabled: !!existingId,
    gcTime: 0,
  });

  return (
    <Dialog open={editing !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-h-[90vh] max-w-2xl overflow-y-auto"
        title={editing === "new" ? "New question" : "Edit question"}
      >
        {editing === "new" && topics && (
          <QuestionForm
            topics={topics}
            onCancel={onClose}
            onSubmit={onSubmit}
          />
        )}
        {existingId && detail.isPending && <Skeleton className="h-64 w-full" />}
        {existingId && detail.isError && (
          <p className="text-destructive text-sm">{detail.error.message}</p>
        )}
        {existingId && detail.data && topics && (
          <QuestionForm
            key={detail.data.id}
            topics={topics}
            initial={toInput(detail.data)}
            onCancel={onClose}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
