"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  HelpCircle,
  LayoutGrid,
  Megaphone,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Skeleton, Spinner } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/blocks";
import { ApiClientError, api } from "@/lib/api-client";
import { TYPE_LABEL } from "@/shared/schemas/question";
import type { AttemptState, SubmitResult } from "@/shared/schemas/attempt";
import type {
  AnnouncementItem,
  HeartbeatResponse,
  IncidentType,
} from "@/shared/schemas/monitoring";

type DraftAnswer = {
  selectedOptionIds: number[];
  textAnswer: string;
  markedForReview: boolean;
  seq: number;
};

type SaveChip = "saved" | "saving" | "unsaved" | "error";

function formatClock(ms: number) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function isAnswered(a: DraftAnswer | undefined) {
  if (!a) return false;
  return a.selectedOptionIds.length > 0 || a.textAnswer.trim().length > 0;
}

function buildInitialDrafts(attempt: AttemptState): Record<string, DraftAnswer> {
  const initial: Record<string, DraftAnswer> = {};
  for (const q of attempt.questions) {
    initial[q.id] = {
      selectedOptionIds: [],
      textAnswer: "",
      markedForReview: false,
      seq: 0,
    };
  }
  for (const a of attempt.answers) {
    initial[a.attemptQuestionId] = {
      selectedOptionIds: a.selectedOptionIds,
      textAnswer: a.textAnswer ?? "",
      markedForReview: a.markedForReview,
      seq: a.seq,
    };
  }
  return initial;
}

export function ExamWorkspace({ attemptId }: { attemptId: string }) {
  const attemptQuery = useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: () => api<AttemptState>(`/api/attempts/${attemptId}`),
    refetchOnWindowFocus: false,
  });

  if (attemptQuery.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (attemptQuery.isError || !attemptQuery.data) {
    return (
      <EmptyState
        title="Could not open attempt"
        text={attemptQuery.error?.message ?? "Attempt not found"}
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to home</Link>
          </Button>
        }
      />
    );
  }
  return <AttemptSession key={attemptQuery.data.id} attempt={attemptQuery.data} />;
}

function AttemptSession({ attempt }: { attempt: AttemptState }) {
  const attemptId = attempt.id;
  const qc = useQueryClient();
  const [index, setIndex] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [saveChip, setSaveChip] = useState<SaveChip>("saved");
  const [drafts, setDrafts] = useState<Record<string, DraftAnswer>>(() =>
    buildInitialDrafts(attempt),
  );
  const [remainingMs, setRemainingMs] = useState<number>(() =>
    Math.max(0, Date.parse(attempt.deadlineAt) - Date.parse(attempt.serverNow)),
  );
  const [announcement, setAnnouncement] = useState("");
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [dismissedAnn, setDismissedAnn] = useState<Set<string>>(new Set());
  const [submittedResult, setSubmittedResult] = useState<SubmitResult | null>(
    null,
  );

  // Monotonic clock anchor: serverNowMs + (performance.now() - anchorPerfMs).
  const clockRef = useRef<{
    serverNowMs: number;
    anchorPerfMs: number;
    deadlineMs: number;
  } | null>(null);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const inFlightRef = useRef(0);
  const autoSubmittedRef = useRef(false);
  const announcedThresholdsRef = useRef<Set<number>>(new Set());
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    clockRef.current = {
      serverNowMs: Date.parse(attempt.serverNow),
      anchorPerfMs: performance.now(),
      deadlineMs: Date.parse(attempt.deadlineAt),
    };
  }, [attempt.serverNow, attempt.deadlineAt]);

  const submitMutation = useMutation({
    mutationFn: () =>
      api<SubmitResult>(`/api/attempts/${attemptId}/submit`, {
        method: "POST",
      }),
    onSuccess: (res) => {
      setConfirmSubmit(false);
      setSubmittedResult(res);
      qc.invalidateQueries({ queryKey: ["attempt", attemptId] });
      qc.invalidateQueries({ queryKey: ["my-exams"] });
      toast.success(
        res.submitReason === "TIMEOUT"
          ? "Time is up. Your attempt has been submitted."
          : "Exam submitted.",
      );
    },
    onError: (e) => {
      setConfirmSubmit(false);
      toast.error(e.message);
    },
  });

  // Flush a single question answer immediately to the server.
  const flushAnswer = useCallback(
    async (aqId: string, draft: DraftAnswer) => {
      inFlightRef.current += 1;
      setSaveChip("saving");
      try {
        await api(`/api/attempts/${attemptId}/answers`, {
          method: "PUT",
          body: {
            attemptQuestionId: aqId,
            selectedOptionIds: draft.selectedOptionIds,
            textAnswer: draft.textAnswer,
            markedForReview: draft.markedForReview,
            seq: draft.seq,
          },
        });
        inFlightRef.current = Math.max(0, inFlightRef.current - 1);
        if (inFlightRef.current === 0 && timersRef.current.size === 0) {
          setSaveChip("saved");
        }
      } catch (e) {
        inFlightRef.current = Math.max(0, inFlightRef.current - 1);
        if (e instanceof ApiClientError && e.code === "ATTEMPT_CLOSED") {
          toast.error("Exam time has ended.");
          qc.invalidateQueries({ queryKey: ["attempt", attemptId] });
        } else {
          setSaveChip("error");
          toast.error(
            e instanceof Error ? e.message : "Could not save answer",
          );
        }
      }
    },
    [attemptId, qc],
  );

  // Schedule debounced autosave (~600ms).
  const updateDraft = useCallback(
    (aqId: string, updater: (prev: DraftAnswer) => Omit<DraftAnswer, "seq">) => {
      setDrafts((prev) => {
        const cur = prev[aqId] ?? {
          selectedOptionIds: [],
          textAnswer: "",
          markedForReview: false,
          seq: 0,
        };
        const next: DraftAnswer = { ...updater(cur), seq: cur.seq + 1 };
        const existingTimer = timersRef.current.get(aqId);
        if (existingTimer) clearTimeout(existingTimer);
        setSaveChip("unsaved");
        const t = setTimeout(() => {
          timersRef.current.delete(aqId);
          void flushAnswer(aqId, next);
        }, 600);
        timersRef.current.set(aqId, t);
        return { ...prev, [aqId]: next };
      });
    },
    [flushAnswer],
  );

  // Flush all pending debounced timers before final submit.
  const flushAllAndSubmit = useCallback(async () => {
    const pending: Promise<void>[] = [];
    for (const [aqId, t] of timersRef.current.entries()) {
      clearTimeout(t);
      timersRef.current.delete(aqId);
      const d = drafts[aqId];
      if (d) pending.push(flushAnswer(aqId, d));
    }
    if (pending.length > 0) await Promise.allSettled(pending);
    submitMutation.mutate();
  }, [drafts, flushAnswer, submitMutation]);

  // Monotonic countdown tick + accessibility announcements + auto-submit at 0.
  useEffect(() => {
    if (!attempt || attempt.status !== "IN_PROGRESS" || submittedResult) return;
    const id = setInterval(() => {
      const clk = clockRef.current;
      if (!clk) return;
      const nowServerMs =
        clk.serverNowMs + (performance.now() - clk.anchorPerfMs);
      const left = Math.max(0, clk.deadlineMs - nowServerMs);
      setRemainingMs(left);

      const sec = Math.ceil(left / 1000);
      for (const mins of [10, 5, 1]) {
        if (sec <= mins * 60 && !announcedThresholdsRef.current.has(mins)) {
          announcedThresholdsRef.current.add(mins);
          setAnnouncement(
            mins === 1
              ? "1 minute remaining in this exam."
              : `${mins} minutes remaining in this exam.`,
          );
        }
      }
      if (left <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        setAnnouncement("Time is up. Submitting your exam.");
        void flushAllAndSubmit();
      }
    }, 500);
    return () => clearInterval(id);
  }, [attempt, submittedResult, flushAllAndSubmit]);

  // Move focus to question heading when switching questions for screen-reader/keyboard clarity.
  useEffect(() => {
    if (!reviewMode) headingRef.current?.focus();
  }, [index, reviewMode]);

  // Heartbeat (~10s): updates last_seen_at, syncs deadline (picks up time extensions), fetches announcements.
  useEffect(() => {
    if (attempt.status !== "IN_PROGRESS" || submittedResult) return;
    let active = true;
    async function beat() {
      try {
        const res = await api<HeartbeatResponse>(
          `/api/attempts/${attemptId}/heartbeat`,
          { method: "POST" },
        );
        if (!active) return;
        const newDeadline = Date.parse(res.deadlineAt);
        const prevDeadline = clockRef.current?.deadlineMs;
        clockRef.current = {
          serverNowMs: Date.parse(res.serverNow),
          anchorPerfMs: performance.now(),
          deadlineMs: newDeadline,
        };
        if (prevDeadline && newDeadline > prevDeadline) {
          toast.info("Your examiner granted additional time.");
        }
        setAnnouncements(res.announcements);
        if (res.status === "SUBMITTED") {
          qc.invalidateQueries({ queryKey: ["attempt", attemptId] });
        }
      } catch {
        // Network drops are handled gracefully without interrupting the candidate.
      }
    }
    void beat();
    const id = setInterval(() => void beat(), 10_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [attempt.status, attemptId, qc, submittedResult]);

  // Advisory browser-signal listeners (never penalize; skipped in sandbox).
  useEffect(() => {
    if (attempt.status !== "IN_PROGRESS" || attempt.isSandbox || submittedResult)
      return;
    const report = (type: IncidentType) => {
      void api(`/api/attempts/${attemptId}/incidents`, {
        method: "POST",
        body: { type },
      }).catch(() => {});
    };
    const onVis = () => {
      if (document.hidden) report("TAB_HIDDEN");
    };
    const onBlur = () => report("WINDOW_BLUR");
    const onCopyPaste = () => report("COPY_PASTE");
    const onFs = () => {
      if (!document.fullscreenElement) report("FULLSCREEN_EXIT");
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    document.addEventListener("copy", onCopyPaste);
    document.addEventListener("paste", onCopyPaste);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("copy", onCopyPaste);
      document.removeEventListener("paste", onCopyPaste);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [attempt.status, attempt.isSandbox, attemptId, submittedResult]);

  const currentQuestion = attempt?.questions[index];
  const currentDraft = currentQuestion ? drafts[currentQuestion.id] : undefined;

  // Keyboard shortcuts: Left/Right navigate, 1-9 select option, f flag (disabled while typing in textarea/input).
  useEffect(() => {
    if (!attempt || attempt.status !== "IN_PROGRESS" || reviewMode || confirmSubmit)
      return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;
      if (!attempt || !currentQuestion) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        setIndex((i) => Math.min(attempt.questions.length - 1, i + 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        updateDraft(currentQuestion.id, (cur) => ({
          selectedOptionIds: cur.selectedOptionIds,
          textAnswer: cur.textAnswer,
          markedForReview: !cur.markedForReview,
        }));
      } else if (
        currentQuestion.type !== "WRITTEN" &&
        /^[1-9]$/.test(e.key)
      ) {
        const opt = currentQuestion.options[Number(e.key) - 1];
        if (!opt) return;
        e.preventDefault();
        updateDraft(currentQuestion.id, (cur) => {
          if (currentQuestion.type === "MCQ_SINGLE") {
            return { ...cur, selectedOptionIds: [opt.id] };
          }
          const exists = cur.selectedOptionIds.includes(opt.id);
          return {
            ...cur,
            selectedOptionIds: exists
              ? cur.selectedOptionIds.filter((x) => x !== opt.id)
              : [...cur.selectedOptionIds, opt.id],
          };
        });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [attempt, currentQuestion, reviewMode, confirmSubmit, updateDraft]);

  const counts = useMemo(() => {
    if (!attempt) return { answered: 0, unanswered: 0, flagged: 0 };
    let answered = 0;
    let flagged = 0;
    for (const q of attempt.questions) {
      const d = drafts[q.id];
      if (isAnswered(d)) answered++;
      if (d?.markedForReview) flagged++;
    }
    return {
      answered,
      unanswered: attempt.questions.length - answered,
      flagged,
    };
  }, [attempt, drafts]);

  // Submitted state screen
  if (attempt.status === "SUBMITTED" || submittedResult) {
    const reason =
      submittedResult?.submitReason ?? attempt.submitReason ?? "USER";
    return (
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="text-success h-5 w-5" />
            {attempt.examTitle} — Submitted
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            {reason === "TIMEOUT"
              ? "Your attempt reached the server deadline and was automatically submitted with all saved answers."
              : "Your answers have been recorded. Results will be available on your home page once the examiner publishes them."}
          </p>
          <div className="bg-muted grid grid-cols-2 gap-3 rounded-md p-3">
            <div>
              <p className="text-muted-foreground text-xs">Questions answered</p>
              <p className="font-semibold">
                {submittedResult?.answeredCount ?? counts.answered} /{" "}
                {attempt.questions.length}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Status</p>
              <p className="font-semibold">
                {(submittedResult?.gradingStatus ?? attempt.gradingStatus) ===
                "NEEDS_REVIEW"
                  ? "Awaiting written grading"
                  : "Auto-graded"}
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href="/dashboard">Return to home</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const ms = remainingMs ?? 0;
  const urgency =
    ms <= 60_000
      ? "border-destructive bg-destructive/15 text-destructive"
      : ms <= 5 * 60_000
        ? "border-warning bg-warning/15 text-warning"
        : ms <= 10 * 60_000
          ? "border-warning/60 bg-warning/10 text-warning"
          : "border-border bg-card text-foreground";

  const paletteList = (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">Questions</span>
        <span className="text-muted-foreground">
          {counts.answered}/{attempt.questions.length} answered
        </span>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {attempt.questions.map((q, i) => {
          const d = drafts[q.id];
          const done = isAnswered(d);
          const flagged = !!d?.markedForReview;
          const active = !reviewMode && i === index;
          return (
            <button
              key={q.id}
              type="button"
              aria-label={`Question ${i + 1}${done ? ", answered" : ", unanswered"}${flagged ? ", flagged" : ""}`}
              aria-current={active ? "step" : undefined}
              onClick={() => {
                setReviewMode(false);
                setIndex(i);
                setPaletteOpen(false);
              }}
              className={`relative flex h-10 items-center justify-center gap-0.5 rounded-md border text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                active
                  ? "border-primary ring-primary/40 ring-2"
                  : "border-border"
              } ${
                done
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground hover:bg-muted"
              }`}
            >
              <span>{i + 1}</span>
              {done && <Check className="h-3 w-3" aria-hidden="true" />}
              {flagged && (
                <Flag
                  className="text-warning absolute -top-1 -right-1 h-3 w-3 fill-current"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
      <div className="text-muted-foreground space-y-1 border-t pt-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="bg-primary text-primary-foreground inline-flex h-4 w-4 items-center justify-center rounded">
            <Check className="h-2.5 w-2.5" />
          </span>
          Answered ({counts.answered})
        </div>
        <div className="flex items-center gap-1.5">
          <span className="border-border inline-block h-4 w-4 rounded border" />
          Unanswered ({counts.unanswered})
        </div>
        <div className="flex items-center gap-1.5">
          <Flag className="text-warning h-3.5 w-3.5 fill-current" />
          Flagged for review ({counts.flagged})
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Screen-reader timer threshold announcements */}
      <div className="sr-only" role="status" aria-live="assertive">
        {announcement}
      </div>

      {attempt.isSandbox && (
        <div className="border-warning bg-warning/15 text-warning flex items-center justify-between rounded-md border px-4 py-2 text-sm font-medium">
          <span>
            SANDBOX PREVIEW — This attempt is for testing only and is never
            counted in statistics or reports.
          </span>
          <Button asChild size="sm" variant="outline">
            <Link href={`/exams/${attempt.examId}`}>Exit sandbox</Link>
          </Button>
        </div>
      )}

      {/* Dismissible examiner announcements */}
      {announcements
        .filter((a) => !dismissedAnn.has(a.id))
        .map((a) => (
          <div
            key={a.id}
            role="status"
            className="border-primary/40 bg-accent text-accent-foreground flex items-start justify-between gap-3 rounded-md border px-4 py-2.5 text-sm"
          >
            <div className="flex items-start gap-2">
              <Megaphone className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <span className="font-medium">Announcement:</span> {a.message}
              </div>
            </div>
            <button
              type="button"
              aria-label="Dismiss announcement"
              className="hover:opacity-75"
              onClick={() =>
                setDismissedAnn((prev) => new Set(prev).add(a.id))
              }
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}

      {/* Top exam bar */}
      <div className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">{attempt.examTitle}</h1>
          <p className="text-muted-foreground text-xs">
            Question {index + 1} of {attempt.questions.length}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={
              saveChip === "error"
                ? "bg-destructive/15 text-destructive"
                : saveChip === "saved"
                  ? "bg-success/15 text-success"
                  : "bg-muted text-muted-foreground"
            }
          >
            {saveChip === "saved"
              ? "Saved"
              : saveChip === "saving"
                ? "Saving..."
                : saveChip === "unsaved"
                  ? "Unsaved changes"
                  : "Save error"}
          </Badge>

          <div
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-sm font-semibold ${urgency}`}
            aria-label={`Time remaining ${formatClock(ms)}`}
          >
            <Clock className="h-4 w-4" aria-hidden="true" />
            <span>{formatClock(ms)}</span>
            {ms <= 60_000 && (
              <span className="font-sans text-xs font-medium">· &lt;1 min</span>
            )}
            {ms > 60_000 && ms <= 5 * 60_000 && (
              <span className="font-sans text-xs font-medium">· &lt;5 min</span>
            )}
          </div>

          <Button
            size="icon"
            variant="outline"
            className="lg:hidden"
            aria-label="Open question palette"
            onClick={() => setPaletteOpen(true)}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            aria-label="Keyboard shortcuts"
            onClick={() => setHelpOpen(true)}
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main grid: Question / Review panel + Desktop Palette */}
      <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
        <div>
          {reviewMode ? (
            <Card>
              <CardHeader>
                <CardTitle>Review before submitting</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground text-xs">Answered</p>
                    <p className="text-2xl font-semibold">{counts.answered}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground text-xs">Unanswered</p>
                    <p className="text-2xl font-semibold">
                      {counts.unanswered}
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground text-xs">
                      Flagged for review
                    </p>
                    <p className="text-2xl font-semibold">{counts.flagged}</p>
                  </div>
                </div>

                {counts.unanswered > 0 && (
                  <p className="text-warning flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    You still have {counts.unanswered} unanswered question(s).
                  </p>
                )}

                <ul className="divide-y rounded-md border">
                  {attempt.questions.map((q, i) => {
                    const d = drafts[q.id];
                    const done = isAnswered(d);
                    return (
                      <li
                        key={q.id}
                        className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 truncate text-left hover:underline"
                          onClick={() => {
                            setReviewMode(false);
                            setIndex(i);
                          }}
                        >
                          <span className="font-medium">Q{i + 1}.</span>{" "}
                          {q.body}
                        </button>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {d?.markedForReview && (
                            <Badge className="bg-warning/15 text-warning">
                              Flagged
                            </Badge>
                          )}
                          <Badge
                            className={
                              done
                                ? "bg-success/15 text-success"
                                : "bg-muted text-muted-foreground"
                            }
                          >
                            {done ? "Answered" : "Unanswered"}
                          </Badge>
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <div className="flex flex-wrap justify-between gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setReviewMode(false)}
                  >
                    Back to questions
                  </Button>
                  <Button onClick={() => setConfirmSubmit(true)}>
                    <Send className="h-4 w-4" />
                    Submit exam
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            currentQuestion &&
            currentDraft && (
              <Card>
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
                  <div>
                    <h2
                      ref={headingRef}
                      tabIndex={-1}
                      className="text-base font-semibold outline-none"
                    >
                      Question {index + 1} of {attempt.questions.length}
                    </h2>
                    <p className="text-muted-foreground text-xs">
                      {TYPE_LABEL[currentQuestion.type]} ·{" "}
                      {currentQuestion.marks} mark
                      {currentQuestion.marks === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      currentDraft.markedForReview ? "secondary" : "outline"
                    }
                    onClick={() =>
                      updateDraft(currentQuestion.id, (cur) => ({
                        selectedOptionIds: cur.selectedOptionIds,
                        textAnswer: cur.textAnswer,
                        markedForReview: !cur.markedForReview,
                      }))
                    }
                  >
                    <Flag
                      className={`h-3.5 w-3.5 ${currentDraft.markedForReview ? "text-warning fill-current" : ""}`}
                    />
                    {currentDraft.markedForReview
                      ? "Flagged"
                      : "Flag for review"}
                  </Button>
                </CardHeader>

                <CardContent className="space-y-5">
                  <p className="text-base leading-relaxed whitespace-pre-wrap">
                    {currentQuestion.body}
                  </p>

                  {currentQuestion.type === "WRITTEN" ? (
                    <div className="space-y-1.5">
                      <label
                        htmlFor={`written-${currentQuestion.id}`}
                        className="text-sm font-medium"
                      >
                        Your answer
                      </label>
                      <textarea
                        id={`written-${currentQuestion.id}`}
                        rows={8}
                        maxLength={10_000}
                        placeholder="Type your response here..."
                        className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm leading-relaxed focus-visible:ring-2 focus-visible:outline-none"
                        value={currentDraft.textAnswer}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateDraft(currentQuestion.id, (cur) => ({
                            selectedOptionIds: [],
                            textAnswer: val,
                            markedForReview: cur.markedForReview,
                          }));
                        }}
                      />
                      <p className="text-muted-foreground text-right text-xs">
                        {currentDraft.textAnswer.length} / 10,000 characters
                      </p>
                    </div>
                  ) : (
                    <fieldset className="space-y-2.5">
                      <legend className="sr-only">Answer choices</legend>
                      {currentQuestion.options.map((opt, optIdx) => {
                        const checked = currentDraft.selectedOptionIds.includes(
                          opt.id,
                        );
                        return (
                          <label
                            key={opt.id}
                            className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm transition-colors ${
                              checked
                                ? "border-primary bg-accent/60"
                                : "border-border hover:bg-muted/50"
                            }`}
                          >
                            <input
                              type={
                                currentQuestion.type === "MCQ_SINGLE"
                                  ? "radio"
                                  : "checkbox"
                              }
                              name={`q-${currentQuestion.id}`}
                              className="accent-primary mt-0.5 h-4 w-4"
                              checked={checked}
                              onChange={() =>
                                updateDraft(currentQuestion.id, (cur) => {
                                  if (currentQuestion.type === "MCQ_SINGLE") {
                                    return {
                                      ...cur,
                                      selectedOptionIds: [opt.id],
                                    };
                                  }
                                  const next = cur.selectedOptionIds.includes(
                                    opt.id,
                                  )
                                    ? cur.selectedOptionIds.filter(
                                        (x) => x !== opt.id,
                                      )
                                    : [...cur.selectedOptionIds, opt.id];
                                  return { ...cur, selectedOptionIds: next };
                                })
                              }
                            />
                            <span className="flex-1 leading-snug">
                              <span className="text-muted-foreground mr-2 font-mono text-xs">
                                {optIdx + 1}.
                              </span>
                              {opt.body}
                            </span>
                          </label>
                        );
                      })}
                      {currentQuestion.type === "MCQ_SINGLE" &&
                        currentDraft.selectedOptionIds.length > 0 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              updateDraft(currentQuestion.id, (cur) => ({
                                ...cur,
                                selectedOptionIds: [],
                              }))
                            }
                          >
                            Clear selection
                          </Button>
                        )}
                    </fieldset>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={index === 0}
                      onClick={() => setIndex((i) => Math.max(0, i - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setReviewMode(true)}
                      >
                        Review &amp; submit
                      </Button>
                      {index < attempt.questions.length - 1 && (
                        <Button
                          type="button"
                          onClick={() =>
                            setIndex((i) =>
                              Math.min(attempt.questions.length - 1, i + 1),
                            )
                          }
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>

        {/* Desktop side palette */}
        <aside className="hidden lg:block" aria-label="Question navigation">
          <Card className="sticky top-20 p-4">
            {paletteList}
            <Button
              className="mt-4 w-full"
              variant={reviewMode ? "secondary" : "default"}
              onClick={() => setReviewMode(true)}
            >
              Review &amp; submit
            </Button>
          </Card>
        </aside>
      </div>

      {/* Mobile palette drawer */}
      <Dialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <DialogContent title="Question palette">
          {paletteList}
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

      {/* Final submit confirmation */}
      <Dialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <DialogContent
          title="Submit your exam?"
          description="You will not be able to change your answers after submitting."
        >
          <p className="text-sm">
            Answered <b>{counts.answered}</b> of{" "}
            <b>{attempt.questions.length}</b> questions
            {counts.flagged > 0 && ` (${counts.flagged} flagged)`}.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmSubmit(false)}>
              Cancel
            </Button>
            <Button
              disabled={submitMutation.isPending}
              onClick={() => void flushAllAndSubmit()}
            >
              {submitMutation.isPending && <Spinner />}
              Confirm submit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Keyboard shortcuts help */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent title="Keyboard shortcuts">
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              <span>Previous / Next question</span>
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                ← / →
              </code>
            </li>
            <li className="flex justify-between">
              <span>Select option 1–9</span>
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                1 – 9
              </code>
            </li>
            <li className="flex justify-between">
              <span>Flag / unflag question</span>
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                F
              </code>
            </li>
          </ul>
          <p className="text-muted-foreground mt-3 text-xs">
            Shortcuts pause automatically while typing in a written answer box.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
