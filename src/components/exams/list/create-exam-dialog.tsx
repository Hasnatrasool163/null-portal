"use client";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ExamForm } from "@/components/exams/exam-form";
import { examsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { ExamValues } from "@/shared/schemas/exam";

/** "New exam" dialog: creates a draft and navigates to it. */
export function CreateExamDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  // No onError toast: ExamForm shows field errors / a toast from the rejected mutateAsync.
  const create = useMutation({
    mutationFn: (v: ExamValues) => examsApi.create(v),
    onSuccess: (exam) => {
      toast.success("Exam created");
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: qk.exams.all });
      router.push(`/exams/${exam.id}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-2xl overflow-y-auto"
        title="New exam"
        description="Starts as a draft. Assign questions and enroll candidates before publishing."
      >
        {open && (
          <ExamForm
            onCancel={() => onOpenChange(false)}
            onSubmit={async (v) => {
              await create.mutateAsync(v as ExamValues);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
