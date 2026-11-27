"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  UnderlineTabs,
  type UnderlineTab,
} from "@/components/ui/underline-tabs";
import { Skeleton } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/blocks";
import { ExamForm } from "@/components/exams/exam-form";
import { ExamAnalyticsTab } from "@/components/exams/exam-analytics-tab";
import { ExamGradingTab } from "@/components/exams/exam-grading-tab";
import { ExamDisputesTab } from "@/components/exams/exam-disputes-tab";
import { ExamMonitorTab } from "@/components/exams/exam-monitor-tab";
import { AuditLogView } from "@/components/audit/audit-log-view";
import {
  AdminExamActions,
  RescorePanel,
} from "@/components/exams/exam-lifecycle-panels";
import { examsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { editLevel } from "@/shared/exam-lifecycle";
import type { ExamDetail } from "@/shared/schemas/exam";
import {
  ExamConfirmDialog,
  type ConfirmAction,
} from "./detail/exam-confirm-dialog";
import { ExamDetailHeader } from "./detail/exam-detail-header";
import { ExamReviewTab } from "./detail/exam-review-tab";
import { useExamActions } from "./detail/use-exam-actions";
import { useExamTab, type ExamTab } from "./detail/use-exam-tab";
import { EnrollmentsTab } from "./enrollment/enrollments-tab";
import { QuestionsTab } from "./question-set/questions-tab";

function examTabs(exam: ExamDetail): UnderlineTab<ExamTab>[] {
  return [
    { id: "review", label: "Review & publish" },
    { id: "settings", label: "Settings" },
    { id: "questions", label: "Questions", count: exam.questionCount },
    { id: "enrollments", label: "Enrollments", count: exam.enrollmentCount },
    { id: "monitor", label: "Live monitor" },
    { id: "grading", label: "Grading & results" },
    { id: "disputes", label: "Disputes" },
    { id: "analytics", label: "Analytics" },
    { id: "audit", label: "Audit log" },
  ];
}

/** Exam detail page: loads the exam, renders the header, tab strip and active tab. */
export function ExamDetailView({
  examId,
  isAdmin,
}: {
  examId: string;
  isAdmin: boolean;
}) {
  const [tab, openTab] = useExamTab();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null,
  );
  const actions = useExamActions(examId, () => setConfirmAction(null));

  const query = useQuery({
    queryKey: qk.exams.detail(examId),
    queryFn: () => examsApi.get(examId),
  });

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <EmptyState
        title="Could not load exam"
        text={query.error.message}
        action={
          <Button asChild variant="outline">
            <Link href="/exams">Back to exams</Link>
          </Button>
        }
      />
    );
  }

  const exam = query.data;

  return (
    <>
      <ExamDetailHeader
        exam={exam}
        isAdmin={isAdmin}
        previewPending={actions.sandbox.isPending}
        clonePending={actions.clone.isPending}
        onPreview={() => actions.sandbox.mutate(false)}
        onClone={() => actions.clone.mutate()}
        onPublish={() => setConfirmAction("publish")}
        onClose={() => setConfirmAction("close")}
      />

      <UnderlineTabs
        tabs={examTabs(exam)}
        value={tab}
        onChange={openTab}
        label="Exam sections"
        className="-mx-4 px-4 sm:mx-0 sm:px-0"
      />
      <div key={tab} className="animate-page-in space-y-6">
        {tab === "review" && (
          <ExamReviewTab
            exam={exam}
            isAdmin={isAdmin}
            onOpenTab={openTab}
            onPublish={() => setConfirmAction("publish")}
          />
        )}

        {/* Lifecycle notes and panels sit above every tab's content. */}
        {exam.status === "CLOSED" && exam.closeReason && (
          <p className="bg-muted text-muted-foreground rounded-md p-3 text-sm">
            {exam.cancelled ? "Cancelled" : "Closed"} by an administrator:{" "}
            {exam.closeReason}
          </p>
        )}
        {isAdmin && <AdminExamActions exam={exam} />}
        <RescorePanel exam={exam} readOnly={isAdmin} />

        {tab === "settings" && (
          <Card>
            <CardContent className="pt-6">
              <ExamForm
                key={`${exam.id}-${exam.updatedAt}`}
                exam={exam}
                readOnly={isAdmin}
                onSubmit={async (v) => {
                  await actions.update.mutateAsync(v);
                }}
              />
            </CardContent>
          </Card>
        )}

        {tab === "questions" && (
          <QuestionsTab
            key={`${exam.id}-${exam.status}-${exam.questions.length}`}
            exam={exam}
            readOnly={isAdmin}
          />
        )}

        {tab === "enrollments" && (
          <EnrollmentsTab
            examId={exam.id}
            readOnly={isAdmin || editLevel(exam) === "TITLE_ONLY"}
            canRemove={editLevel(exam) === "FULL"}
          />
        )}

        {tab === "monitor" && (
          <ExamMonitorTab examId={exam.id} readOnly={isAdmin} />
        )}

        {tab === "grading" && (
          <ExamGradingTab examId={exam.id} readOnly={isAdmin} />
        )}

        {tab === "disputes" && (
          <ExamDisputesTab examId={exam.id} isAdmin={isAdmin} />
        )}
        {tab === "analytics" && <ExamAnalyticsTab examId={exam.id} />}
        {tab === "audit" && <AuditLogView examId={exam.id} />}
      </div>

      <ExamConfirmDialog
        exam={exam}
        action={confirmAction}
        pending={actions.publish.isPending || actions.close.isPending}
        onCancel={() => setConfirmAction(null)}
        onConfirm={(a) =>
          a === "publish" ? actions.publish.mutate() : actions.close.mutate()
        }
      />
    </>
  );
}
