"use client";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { examsApi } from "@/lib/api";
import type { ExamGradingResponse } from "@/shared/schemas/grading";

/** Publish readiness banner plus the export / publish actions. */
export function GradingStatusBar({
  examId,
  data,
  readOnly,
  onGrade,
  onPublish,
}: {
  examId: string;
  data: ExamGradingResponse;
  readOnly: boolean;
  onGrade: (attemptId: string) => void;
  onPublish: () => void;
}) {
  const nextToGrade = data.attempts.find(
    (a) => a.status === "SUBMITTED" && a.gradingStatus === "NEEDS_REVIEW",
  );

  return (
    <div className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
      <div className="text-sm">
        {data.resultsPublishedAt ? (
          <p className="text-success flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Results published on {formatDateTime(data.resultsPublishedAt)}.
          </p>
        ) : data.publishBlockedReason ? (
          <div
            role="alert"
            className="border-warning/40 bg-warning/10 flex items-start gap-2.5 rounded-md border px-3 py-2"
          >
            <AlertTriangle
              className="text-warning mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <div className="space-y-1.5">
              <p className="font-medium">Results can&apos;t be published yet</p>
              <p className="text-muted-foreground">{data.publishBlockedReason}</p>
              {!readOnly && nextToGrade && (
                <Button size="sm" onClick={() => onGrade(nextToGrade.attemptId)}>
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  Grade next ({nextToGrade.candidateName})
                </Button>
              )}
            </div>
          </div>
        ) : (
          <p className="font-medium">
            All submitted attempts are graded and ready to publish.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          {/* File download, not a JSON endpoint, so it stays a plain link. */}
          <a href={examsApi.resultsCsvUrl(examId)} download>
            <Download className="h-4 w-4" />
            Export CSV
          </a>
        </Button>
        {!readOnly && !data.resultsPublishedAt && (
          <Button disabled={!data.canPublishResults} onClick={onPublish}>
            <Send className="h-4 w-4" />
            Publish results
          </Button>
        )}
      </div>
    </div>
  );
}
