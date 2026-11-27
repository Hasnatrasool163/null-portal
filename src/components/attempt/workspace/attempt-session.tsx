"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScratchpadDrawer } from "@/components/attempt/scratchpad-drawer";
import { PreferencesDialog } from "@/components/attempt/preferences-dialog";
import { useWorkspacePreferences } from "./use-workspace-preferences";
import { useApplyWorkspaceTheme } from "./use-apply-workspace-theme";
import type { AttemptQuestionPublic, AttemptState } from "@/shared/schemas/attempt";
import { countAnswers } from "./draft-answer";
import { useServerClock } from "./use-server-clock";
import { useAnswerSync } from "./use-answer-sync";
import { useExamSubmission } from "./use-exam-submission";
import { useBeforeUnloadGuard } from "./use-before-unload-guard";
import { useFullscreen } from "./use-fullscreen";
import { useExamClock } from "./use-exam-clock";
import { useAttemptNetwork } from "./use-attempt-network";
import { useQuestionNavigation } from "./use-question-navigation";
import { useHeartbeat } from "./use-heartbeat";
import { useProctoringSignals } from "./use-proctoring-signals";
import { useWorkspaceShortcuts } from "./use-workspace-shortcuts";
import { SubmissionReceipt } from "./submission-receipt";
import { SandboxBanner } from "./sandbox-banner";
import { NetworkBanner } from "./network-banner";
import { AnnouncementList } from "./announcement-list";
import { WorkspaceToolbar } from "./workspace-toolbar";
import { SaveStatusBadge } from "./save-status-badge";
import { ExamTimer } from "./exam-timer";
import { ReviewPanel } from "./review-panel";
import { ExamPaper } from "./exam-paper";
import { QuestionCard } from "./question-card";
import { QuestionPalette } from "./question-palette";
import { BottomPaletteBar } from "./bottom-palette-bar";
import { SubmitConfirmDialog } from "./submit-confirm-dialog";
import { TimeUpOverlay } from "./time-up-overlay";
import { OfflineBlockDialog } from "./offline-block-dialog";
import { ShortcutsHelpDialog } from "./shortcuts-help-dialog";

/**
 * A live exam attempt: wires the sync/clock/submission hooks together and lays
 * out the workspace. Hook call order is deliberate (effects run in this order).
 */
export function AttemptSession({ attempt }: { attempt: AttemptState }) {
  const attemptId = attempt.id;
  const [helpOpen, setHelpOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [scratchpadOpen, setScratchpadOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const { prefs } = useWorkspacePreferences();
  useApplyWorkspaceTheme(prefs.theme);

  const clockRef = useServerClock(attempt.serverNow, attempt.deadlineAt);
  const sync = useAnswerSync(attempt, clockRef);
  const { drafts, updateDraft } = sync;
  const submission = useExamSubmission({
    attemptId,
    flushQueue: sync.flushQueue,
    cancelScheduledFlush: sync.cancelScheduledFlush,
  });
  const { submittedResult, confirmSubmit } = submission;
  const live = attempt.status === "IN_PROGRESS" && !submittedResult;

  useBeforeUnloadGuard(sync.queuedCount);
  const { fullscreen, toggleFullscreen } = useFullscreen();
  const { remainingMs, announcement } = useExamClock({
    attempt,
    submittedResult,
    clockRef,
    onTimeUp: submission.autoSubmit,
  });
  const net = useAttemptNetwork({
    attemptId,
    isSandbox: attempt.isSandbox,
    enabled: live,
    onReconnect: () => {
      sync.resetBackoff();
      if (submission.hasAutoSubmitStarted()) submission.retryAutoSubmit();
      else void sync.flushQueue();
    },
  });
  const nav = useQuestionNavigation({
    questionCount: attempt.questions.length,
    layout: prefs.layout,
  });
  const { index, setIndex, reviewMode, setReviewMode, openQuestion } = nav;
  const announcements = useHeartbeat({
    attemptId,
    status: attempt.status,
    submitted: !!submittedResult,
    clockRef,
  });
  useProctoringSignals({
    attemptId,
    status: attempt.status,
    isSandbox: attempt.isSandbox,
    submitted: !!submittedResult,
  });

  const currentQuestion = attempt.questions[index];
  useWorkspaceShortcuts({
    status: attempt.status,
    currentQuestion,
    index,
    reviewMode,
    confirmSubmit,
    updateDraft,
    jumpTo: nav.jumpTo,
    setScratchpadOpen,
    setHelpOpen,
  });

  const counts = useMemo(
    () => countAnswers(attempt.questions, drafts),
    [attempt.questions, drafts],
  );

  if (attempt.status === "SUBMITTED" || submittedResult) {
    return (
      <SubmissionReceipt
        examTitle={attempt.examTitle}
        isSandbox={attempt.isSandbox}
        reason={submittedResult?.submitReason ?? attempt.submitReason ?? "USER"}
        receiptCode={submittedResult?.receiptCode ?? attempt.receiptCode}
        submittedAt={submittedResult?.submittedAt ?? attempt.submittedAt}
        answered={submittedResult?.answeredCount ?? counts.answered}
        total={attempt.questions.length}
        needsReview={
          (submittedResult?.gradingStatus ?? attempt.gradingStatus) ===
          "NEEDS_REVIEW"
        }
      />
    );
  }

  const total = attempt.questions.length;
  const activeIndex = reviewMode ? null : index;
  const openReview = () => setReviewMode(true);
  const openFromPalette = (i: number) => {
    setReviewMode(false);
    setPaletteOpen(false);
    requestAnimationFrame(() => nav.jumpTo(i));
  };

  const renderQuestion = (
    q: AttemptQuestionPublic,
    i: number,
    single: boolean,
  ) => {
    const draft = drafts[q.id];
    if (!draft) return null;
    return (
      <QuestionCard
        question={q}
        index={i}
        total={total}
        draft={draft}
        single={single}
        headingRef={nav.headingRef}
        updateDraft={updateDraft}
        onPrevious={() => setIndex((i) => Math.max(0, i - 1))}
        onNext={() => setIndex((i) => Math.min(total - 1, i + 1))}
        onReview={openReview}
      />
    );
  };

  const palette = (
    <QuestionPalette
      questions={attempt.questions}
      drafts={drafts}
      counts={counts}
      activeIndex={activeIndex}
      onSelect={openFromPalette}
    />
  );

  return (
    <div
      className={`space-y-4 transition-[padding] duration-300 ${scratchpadOpen ? "lg:pr-[416px]" : ""} ${
        prefs.palettePosition === "bottom" ? "pb-20" : ""
      }`}
    >
      {/* Screen-reader timer threshold announcements */}
      <div className="sr-only" role="status" aria-live="assertive">
        {announcement}
      </div>

      {attempt.isSandbox && <SandboxBanner examId={attempt.examId} />}
      <NetworkBanner state={net.state} latencyMs={net.latencyMs} />
      <AnnouncementList announcements={announcements} />

      <WorkspaceToolbar
        examTitle={attempt.examTitle}
        index={index}
        total={total}
        status={
          <>
            <SaveStatusBadge
              netState={net.state}
              saveChip={sync.saveChip}
              queuedCount={sync.queuedCount}
            />
            <ExamTimer remainingMs={remainingMs} timerStyle={prefs.timerStyle} />
          </>
        }
        scratchpadOpen={scratchpadOpen}
        onToggleScratchpad={() => setScratchpadOpen((o) => !o)}
        fullscreen={fullscreen}
        onToggleFullscreen={toggleFullscreen}
        onOpenPreferences={() => setPrefsOpen(true)}
        palettePosition={prefs.palettePosition}
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
      />

      {/* Main grid: Question / Review panel + Desktop Palette */}
      <div
        data-qsize={prefs.fontSize}
        className={`grid gap-6 ${
          prefs.palettePosition === "side" ? "lg:grid-cols-[1fr_240px]" : ""
        }`}
      >
        <div>
          {reviewMode ? (
            <ReviewPanel
              questions={attempt.questions}
              drafts={drafts}
              counts={counts}
              onOpenQuestion={openQuestion}
              onBack={() => setReviewMode(false)}
              onSubmit={() => submission.setConfirmSubmit(true)}
            />
          ) : prefs.layout === "scroll" ? (
            <ExamPaper
              examTitle={attempt.examTitle}
              total={total}
              counts={counts}
              onReview={openReview}
            >
              {attempt.questions.map((q, i) => (
                <div key={q.id}>{renderQuestion(q, i, false)}</div>
              ))}
            </ExamPaper>
          ) : (
            currentQuestion && renderQuestion(currentQuestion, index, true)
          )}
        </div>

        {/* Desktop side palette */}
        {prefs.palettePosition === "side" && (
          <aside className="hidden lg:block" aria-label="Question navigation">
            <Card className="sticky top-4 p-4">
              {palette}
              <Button
                className="mt-4 w-full"
                variant={reviewMode ? "secondary" : "default"}
                onClick={openReview}
              >
                Review &amp; submit
              </Button>
            </Card>
          </aside>
        )}
      </div>

      {prefs.palettePosition === "bottom" && (
        <BottomPaletteBar
          questions={attempt.questions}
          drafts={drafts}
          activeIndex={activeIndex}
          onSelect={openQuestion}
          onReview={openReview}
        />
      )}

      {/* Mobile palette drawer */}
      <Dialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <DialogContent title="Question palette">
          {palette}
          <Button
            className="mt-4 w-full"
            onClick={() => {
              setPaletteOpen(false);
              setReviewMode(true);
            }}
          >
            Review &amp; submit
          </Button>
        </DialogContent>
      </Dialog>

      <SubmitConfirmDialog
        open={confirmSubmit}
        onOpenChange={submission.setConfirmSubmit}
        counts={counts}
        total={total}
        submitting={submission.submitting}
        onConfirm={() => void submission.flushAllAndSubmit()}
      />

      <ScratchpadDrawer
        attemptId={attemptId}
        initialText={attempt.scratchpad}
        open={scratchpadOpen}
        onOpenChange={setScratchpadOpen}
      />

      <PreferencesDialog open={prefsOpen} onOpenChange={setPrefsOpen} />

      {submission.timeUp && (
        <TimeUpOverlay
          waitingForSync={net.state === "offline" || sync.queuedCount > 0}
        />
      )}

      <OfflineBlockDialog
        pendingCount={submission.offlineBlock}
        onDismiss={() => submission.setOfflineBlock(0)}
        onRetry={() => {
          submission.setOfflineBlock(0);
          void submission.flushAllAndSubmit();
        }}
      />

      <ShortcutsHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
