"use client";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge, Skeleton } from "@/components/ui/misc";
import { questionsApi } from "@/lib/api";
import { plural } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import { DIFFICULTY_LABEL, TYPE_LABEL } from "@/shared/schemas/question";

/** Read-only preview: how the question looks to a candidate, with the answer key marked. */
export function QuestionPreviewDialog({
  questionId,
  onClose,
}: {
  questionId: string | null;
  onClose: () => void;
}) {
  const q = useQuery({
    queryKey: qk.questions.detail(questionId ?? ""),
    queryFn: () => questionsApi.get(questionId!),
    enabled: questionId !== null,
  });

  return (
    <Dialog open={questionId !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-h-[90vh] max-w-2xl overflow-y-auto"
        title="Question preview"
        description="As a candidate sees it. Correct answers are highlighted for you only."
      >
        {q.isPending && <Skeleton className="h-48 w-full" />}
        {q.isError && (
          <p className="text-destructive text-sm">{q.error.message}</p>
        )}
        {q.data && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              <Badge>{q.data.topicName}</Badge>
              <Badge>{TYPE_LABEL[q.data.type]}</Badge>
              <Badge>{DIFFICULTY_LABEL[q.data.difficulty]}</Badge>
              <Badge>{plural(q.data.defaultMarks, "mark")}</Badge>
            </div>
            <p className="text-base font-medium whitespace-pre-wrap">
              {q.data.body}
            </p>
            {q.data.type === "WRITTEN" ? (
              <div className="text-muted-foreground min-h-24 rounded-md border border-dashed p-3 text-sm">
                Candidate types a written answer here.
              </div>
            ) : (
              <ul className="space-y-2">
                {q.data.type === "MCQ_MULTI" && (
                  <li className="text-muted-foreground text-xs">
                    Select all that apply.
                  </li>
                )}
                {q.data.options.map((o) => (
                  <li
                    key={o.id}
                    className={`flex items-center gap-3 rounded-md border p-3 text-sm ${
                      o.isCorrect ? "border-success bg-success/10" : ""
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-4 w-4 shrink-0 border ${
                        q.data.type === "MCQ_SINGLE"
                          ? "rounded-full"
                          : "rounded-sm"
                      }`}
                    />
                    <span className="flex-1 whitespace-pre-wrap">{o.body}</span>
                    {o.isCorrect && (
                      <span className="text-success inline-flex items-center gap-1 text-xs font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Correct
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
