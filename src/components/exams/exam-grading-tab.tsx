"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Pagination, usePaged } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/misc";
import { EmptyState } from "@/components/ui/blocks";
import { GradeByQuestion } from "@/components/exams/grade-by-question";
import { AttemptGradingDialog } from "@/components/exams/grading/attempt-grading-dialog";
import { GradingAttemptsTable } from "@/components/exams/grading/grading-attempts-table";
import {
  GradingModeToggle,
  type GradingMode,
} from "@/components/exams/grading/grading-mode-toggle";
import { GradingStatusBar } from "@/components/exams/grading/grading-status-bar";
import { PublishResultsDialog } from "@/components/exams/grading/publish-results-dialog";
import { examsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";

export function ExamGradingTab({
  examId,
  readOnly,
}: {
  examId: string;
  readOnly: boolean;
}) {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [mode, setMode] = useState<GradingMode>("candidate");

  const grading = useQuery({
    queryKey: qk.grading.exam(examId),
    queryFn: () => examsApi.grading(examId),
  });
  const refreshGrading = () =>
    qc.invalidateQueries({ queryKey: qk.grading.exam(examId) });

  const paged = usePaged(grading.data?.attempts ?? [], 10);

  if (grading.isPending) return <Skeleton className="h-48 w-full" />;
  if (grading.isError) {
    return (
      <EmptyState
        title="Could not load grading data"
        text={grading.error.message}
        action={<Button onClick={() => grading.refetch()}>Try again</Button>}
      />
    );
  }

  const data = grading.data;
  const hasWritten = data.attempts.some(
    (a) => a.status === "SUBMITTED" && a.answers.some((x) => x.type === "WRITTEN"),
  );
  const activeAttempt = data.attempts.find((a) => a.attemptId === activeId);

  return (
    <div className="space-y-4">
      <GradingStatusBar
        examId={examId}
        data={data}
        readOnly={readOnly}
        onGrade={setActiveId}
        onPublish={() => setConfirmPublish(true)}
      />

      {hasWritten && <GradingModeToggle mode={mode} onChange={setMode} />}

      {hasWritten && mode === "question" ? (
        <GradeByQuestion
          data={data}
          readOnly={readOnly}
          onSaved={refreshGrading}
        />
      ) : data.attempts.length === 0 ? (
        <EmptyState
          title="No attempts yet"
          text="Real candidate attempts (excluding sandbox previews) will appear here once candidates start the exam."
        />
      ) : (
        <GradingAttemptsTable
          attempts={paged.slice}
          readOnly={readOnly}
          onOpen={setActiveId}
        />
      )}

      <Pagination
        page={paged.page}
        pageSize={paged.pageSize}
        total={paged.total}
        onPage={paged.setPage}
        noun="attempts"
      />

      <AttemptGradingDialog
        examId={examId}
        attempt={activeAttempt}
        readOnly={readOnly}
        onClose={() => setActiveId(null)}
        onSaved={refreshGrading}
      />

      <PublishResultsDialog
        examId={examId}
        data={data}
        open={confirmPublish}
        onOpenChange={setConfirmPublish}
      />
    </div>
  );
}
