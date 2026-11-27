"use client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { examsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { editLevel } from "@/shared/exam-lifecycle";
import type { ExamDetail } from "@/shared/schemas/exam";
import { PanelHeader } from "./panel-header";
import { RescoreForm } from "./rescore-form";
import { RescoreHistory } from "./rescore-history";

/** Completed exams: audited answer-key rescore (old and new values are kept). */
export function RescorePanel({
  exam,
  readOnly,
}: {
  exam: ExamDetail;
  readOnly: boolean;
}) {
  const history = useQuery({
    queryKey: qk.exams.rescores(exam.id),
    queryFn: () => examsApi.rescores(exam.id),
  });

  if (editLevel(exam) !== "TITLE_ONLY" || exam.status === "DRAFT") return null;

  return (
    <Card className="overflow-hidden">
      <PanelHeader
        title="Answer-key rescore"
        description="Correct a wrong answer key after the exam. Every affected attempt is re-marked and the change is audited."
      />
      {!readOnly && !exam.cancelled && <RescoreForm exam={exam} />}
      {history.data && history.data.length > 0 && (
        <RescoreHistory exam={exam} runs={history.data} />
      )}
    </Card>
  );
}
