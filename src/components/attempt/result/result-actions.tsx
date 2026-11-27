"use client";
import { Scale } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { DownloadButton } from "@/components/ui/download-button";
import { formatShortDateTime } from "@/lib/format";
import { attemptsApi } from "@/lib/api";
import type { AttemptDisputes } from "@/shared/schemas/dispute";

/** Top bar of the result page: back link, dispute shortcuts and the PDF download. */
export function ResultActions({
  attemptId,
  disputes,
  canFile,
  onRaiseDispute,
}: {
  attemptId: string;
  disputes: AttemptDisputes | undefined;
  canFile: boolean;
  onRaiseDispute: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <BackButton href="/dashboard" label="Dashboard" />
      <div className="flex flex-wrap items-center gap-2">
        {(disputes?.disputes.length ?? 0) > 0 && (
          <Button variant="ghost" asChild>
            <a href="#disputes">
              <Scale className="h-4 w-4" />
              Disputes ({disputes!.disputes.length})
            </a>
          </Button>
        )}
        {canFile && (
          <Button
            variant="outline"
            tooltip={
              disputes?.fileBy
                ? `Open until ${formatShortDateTime(disputes.fileBy)}`
                : undefined
            }
            onClick={onRaiseDispute}
          >
            <Scale className="h-4 w-4" />
            Raise a dispute
          </Button>
        )}
        <DownloadButton
          href={attemptsApi.reportPdfUrl(attemptId)}
          fallbackName="result-report.pdf"
        >
          Download verifiable PDF
        </DownloadButton>
      </div>
    </div>
  );
}
