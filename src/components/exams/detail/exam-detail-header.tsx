"use client";
import { CopyPlus, Eye, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Spinner } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/blocks";
import { PhaseStatus } from "@/components/exams/list/phase-status";
import { formatDateTime } from "@/lib/format";
import type { ExamDetail } from "@/shared/schemas/exam";

/** Title, schedule and the examiner's top-level actions for one exam. */
export function ExamDetailHeader({
  exam,
  isAdmin,
  previewPending,
  clonePending,
  onPreview,
  onClone,
  onPublish,
  onClose,
}: {
  exam: ExamDetail;
  isAdmin: boolean;
  previewPending: boolean;
  clonePending: boolean;
  onPreview: () => void;
  onClone: () => void;
  onPublish: () => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4">
      <BackButton href="/exams" label="All exams" />
      <PageHeader
        title={exam.title}
        subtitle={`${formatDateTime(exam.startsAt)} – ${formatDateTime(exam.endsAt)} · ${exam.durationMinutes} min`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PhaseStatus
              phase={exam.phase}
              className="bg-card shadow-elev-1 h-10 rounded-md border px-3"
            />
            {!isAdmin && exam.questionCount > 0 && (
              <Button
                variant="outline"
                disabled={previewPending}
                onClick={onPreview}
              >
                <Eye className="h-4 w-4" />
                Preview as candidate
              </Button>
            )}
            {!isAdmin && (
              <Button
                variant="outline"
                disabled={clonePending}
                onClick={onClone}
              >
                {clonePending ? <Spinner /> : <CopyPlus className="h-4 w-4" />}
                Duplicate
              </Button>
            )}
            {!isAdmin && exam.status === "DRAFT" && (
              <Button
                disabled={!exam.readiness.ready}
                tooltip={
                  exam.readiness.ready
                    ? undefined
                    : `Finish setup first: ${exam.readiness.blockers[0] ?? ""}`
                }
                onClick={onPublish}
              >
                <Send className="h-4 w-4" />
                Publish exam
              </Button>
            )}
            {!isAdmin && exam.status === "PUBLISHED" && (
              <Button variant="destructive" onClick={onClose}>
                Close exam
              </Button>
            )}
          </div>
        }
      />
    </div>
  );
}
