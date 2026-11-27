"use client";
import { useState } from "react";
import { BackButton } from "@/components/ui/back-button";
import { Skeleton } from "@/components/ui/misc";
import { EmptyState } from "@/components/ui/blocks";
import { AttemptAiSummaryCard } from "@/components/ai/ai-summary-card";
import {
  DisputeDialog,
  FileDisputeDialog,
} from "@/components/disputes/dispute-views";
import { summarizeOutcomes } from "./result/outcome";
import { useAttemptResult } from "./result/use-attempt-result";
import { ResultActions } from "./result/result-actions";
import { ScoreSummaryCard } from "./result/score-summary-card";
import { QuestionBreakdown } from "./result/question-breakdown";
import { DisputesSection } from "./result/disputes-section";

/** Candidate-facing published result: score, per-question breakdown and disputes. */
export function AttemptResultView({ attemptId }: { attemptId: string }) {
  // undefined = dialog closed; "" = whole result; otherwise an attemptQuestionId.
  const [fileFor, setFileFor] = useState<string | undefined>(undefined);
  const [openDispute, setOpenDispute] = useState<string | null>(null);
  const { result, disputes, canFile, liveDisputeFor } =
    useAttemptResult(attemptId);

  if (result.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (result.isError) {
    return (
      <div className="space-y-4">
        <BackButton href="/dashboard" label="Dashboard" />
        <EmptyState title="Result unavailable" text={result.error.message} />
      </div>
    );
  }

  const r = result.data;
  const summary = summarizeOutcomes(r);

  return (
    <div className="space-y-6">
      <ResultActions
        attemptId={r.attemptId}
        disputes={disputes}
        canFile={canFile}
        onRaiseDispute={() => setFileFor("")}
      />

      <ScoreSummaryCard result={r} summary={summary} />

      <AttemptAiSummaryCard attemptId={r.attemptId} />

      <QuestionBreakdown
        questions={r.questions}
        summary={summary}
        canDispute={(q) => canFile && !liveDisputeFor.has(q.position + 1)}
        onDispute={setFileFor}
      />

      <DisputesSection
        disputes={disputes}
        canFile={canFile}
        onRaiseDispute={() => setFileFor("")}
        onOpenDispute={setOpenDispute}
      />

      {fileFor !== undefined && (
        <FileDisputeDialog
          key={fileFor}
          open
          onOpenChange={(o) => !o && setFileFor(undefined)}
          attemptId={r.attemptId}
          questions={r.questions.map((q) => ({
            attemptQuestionId: q.attemptQuestionId,
            position: q.position,
          }))}
          initialQuestionId={fileFor || undefined}
          fileBy={disputes?.fileBy ?? null}
        />
      )}
      <DisputeDialog
        disputeId={openDispute}
        onOpenChange={(o) => !o && setOpenDispute(null)}
      />
    </div>
  );
}
