"use client";
import type { ExamDetail } from "@/shared/schemas/exam";
import { ExamConfigSummary } from "./exam-config-summary";
import { ExamStatStrip } from "./exam-stat-strip";
import { SetupSteps } from "./setup-steps";
import type { ExamTab } from "./use-exam-tab";

/** "Review & publish" tab: headline numbers, draft setup checklist, configuration. */
export function ExamReviewTab({
  exam,
  isAdmin,
  onOpenTab,
  onPublish,
}: {
  exam: ExamDetail;
  isAdmin: boolean;
  onOpenTab: (t: ExamTab) => void;
  onPublish: () => void;
}) {
  return (
    <div className="space-y-6">
      <ExamStatStrip exam={exam} onOpenTab={onOpenTab} />
      {exam.status === "DRAFT" && !isAdmin && (
        <SetupSteps exam={exam} onOpenTab={onOpenTab} onPublish={onPublish} />
      )}
      <ExamConfigSummary exam={exam} />
    </div>
  );
}
