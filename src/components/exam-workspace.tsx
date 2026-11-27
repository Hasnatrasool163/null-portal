"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FlaskConical,
  Flag,
  HelpCircle,
  LayoutGrid,
  Maximize2,
  Megaphone,
  Minimize2,
  NotebookPen,
  RotateCcw,
  Send,
  SlidersHorizontal,
  WifiOff,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Skeleton, Spinner } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/blocks";
import {
  ScratchpadDrawer,
  clearLocalSketch,
} from "@/components/scratchpad-drawer";
import {
  PreferencesDialog,
  useApplyWorkspaceTheme,
  useWorkspacePreferences,
} from "@/components/preferences-dialog";
import { useNetworkStatus } from "@/lib/use-network-status";
import {
  enqueueAnswer,
  getQueuedAnswers,
  removeQueuedAnswers,
} from "@/lib/offline-queue";
import { ApiClientError, api } from "@/lib/api-client";
import type { SyncBatchResponse } from "@/shared/schemas/sync";
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

function buildInitialDrafts(
  attempt: AttemptState,
): Record<string, DraftAnswer> {
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
  return (
    <AttemptSession key={attemptQuery.data.id} attempt={attemptQuery.data} />
  );
}

function AttemptSession({ attempt }: { attempt: AttemptState }) {
  const attemptId = attempt.id;
  const router = useRouter();
  const qc = useQueryClient();
  const [index, setIndex] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [scratchpadOpen, setScratchpadOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const { prefs } = useWorkspacePreferences();
  useApplyWorkspaceTheme(prefs.theme);
  const [timeUp, setTimeUp] = useState(false);
  const [offlineBlock, setOfflineBlock] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [saveChip, setSaveChip] = useState<SaveChip>("saved");
  const [queuedCount, setQueuedCount] = useState(0);
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
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushRef = useRef<() => Promise<number>>(async () => 0);
  const wasFailingRef = useRef(false);
  const autoRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSubmitRef = useRef<() => Promise<void>>(async () => {});
  const backoffRef = useRef(2000);
  const syncingRef = useRef(false);
  const autoSubmittedRef = useRef(false);
  const announcedThresholdsRef = useRef<Set<number>>(new Set());
  const headingRef = useRef<HTMLHeadingElement>(null);
  const startedAtMs = useMemo(
    () => Date.parse(attempt.startedAt),
    [attempt.startedAt],
  );

  useEffect(() => {
    clockRef.current = {
      serverNowMs: Date.parse(attempt.serverNow),
      anchorPerfMs: performance.now(),
      deadlineMs: Date.parse(attempt.deadlineAt),
    };
  }, [attempt.serverNow, attempt.deadlineAt]);

  function onSubmitted(res: SubmitResult) {
    setConfirmSubmit(false);
    setTimeUp(false);
    setSubmittedResult(res);
    clearLocalSketch(attemptId);
    qc.invalidateQueries({ queryKey: ["attempt", attemptId] });
    qc.invalidateQueries({ queryKey: ["my-exams"] });
    toast.success(
      res.submitReason === "TIMEOUT"
        ? "Time is up. Your attempt has been submitted."
        : "Exam submitted.",
    );
  }

  const submitMutation = useMutation({
    mutationFn: () =>
      api<SubmitResult>(`/api/attempts/${attemptId}/submit`, {
        method: "POST",
      }),
    onSuccess: (res) => onSubmitted(res),
    onError: (e) => {
      setSubmitting(false);
      setConfirmSubmit(false);
      toast.error(e.message);
    },
  });

  // Flush the durable IndexedDB queue to POST /api/attempts/[id]/sync with exponential backoff.
  const flushQueue = useCallback(async (): Promise<number> => {
    if (syncingRef.current) return (await getQueuedAnswers(attemptId)).length;
    const queued = await getQueuedAnswers(attemptId);
    setQueuedCount(queued.length);
    if (queued.length === 0) {
      setSaveChip("saved");
      return 0;
    }
    syncingRef.current = true;
    setSaveChip("saving");
    try {
      const res = await api<SyncBatchResponse>(
        `/api/attempts/${attemptId}/sync`,
        {
          method: "POST",
          body: {
            items: queued.map((q) => ({
              attemptQuestionId: q.attemptQuestionId,
              selectedOptionIds: q.selectedOptionIds,
              textAnswer: q.textAnswer,
              markedForReview: q.markedForReview,
              seq: q.seq,
              capturedElapsedMs: q.capturedElapsedMs,
            })),
          },
        },
      );
      backoffRef.current = 2000;
      const doneKeys = queued.map((q) => q.key);
      await removeQueuedAnswers(attemptId, doneKeys);
      const remaining = await getQueuedAnswers(attemptId);
      setQueuedCount(remaining.length);
      setSaveChip(remaining.length === 0 ? "saved" : "unsaved");
      if (wasFailingRef.current) {
        wasFailingRef.current = false;
        const synced = queued.length - res.rejected;
        if (synced > 0)
          toast.success(
            `${synced} answer${synced === 1 ? "" : "s"} synced to the server`,
          );
      }

      if (res.acceptedLate > 0) {
        toast.info(
          `${res.acceptedLate} offline answer(s) recovered within the recovery window and flagged for examiner review.`,
        );
      }
      if (res.rejected > 0) {
        toast.error(
          `${res.rejected} answer(s) could not be accepted after the deadline.`,
        );
      }
      if (res.attemptStatus === "SUBMITTED") {
        qc.invalidateQueries({ queryKey: ["attempt", attemptId] });
      }
      return remaining.length;
    } catch {
      wasFailingRef.current = true;
      setSaveChip("error");
      // Schedule exponential backoff retry (2s -> 4s -> 8s -> 15s).
      const delay = backoffRef.current;
      backoffRef.current = Math.min(15_000, delay * 2);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushTimerRef.current = setTimeout(() => {
        void flushRef.current();
      }, delay);
      return queued.length;
    } finally {
      syncingRef.current = false;
    }
  }, [attemptId, qc]);

  useEffect(() => {
    flushRef.current = flushQueue;
  }, [flushQueue]);

  // Hydrate any durable offline answers from IndexedDB on load/refresh, then flush.
  useEffect(() => {
    let alive = true;
    void getQueuedAnswers(attemptId).then((queued) => {
      if (!alive || queued.length === 0) return;
      setQueuedCount(queued.length);
      setDrafts((prev) => {
        const next = { ...prev };
        for (const q of queued) {
          const cur = next[q.attemptQuestionId];
          if (!cur || q.seq > cur.seq) {
            next[q.attemptQuestionId] = {
              selectedOptionIds: q.selectedOptionIds,
              textAnswer: q.textAnswer,
              markedForReview: q.markedForReview,
              seq: q.seq,
            };
          }
        }
        return next;
      });
      void flushQueue();
    });
    return () => {
      alive = false;
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    };
  }, [attemptId, flushQueue]);

  // Write locally to IndexedDB first, then debounce network flush (~600ms).
  const updateDraft = useCallback(
    (
      aqId: string,
      updater: (prev: DraftAnswer) => Omit<DraftAnswer, "seq">,
    ) => {
      setDrafts((prev) => {
        const cur = prev[aqId] ?? {
          selectedOptionIds: [],
          textAnswer: "",
          markedForReview: false,
          seq: 0,
        };
        const next: DraftAnswer = { ...updater(cur), seq: cur.seq + 1 };
        const clk = clockRef.current;
        const estServerNow = clk
          ? clk.serverNowMs + (performance.now() - clk.anchorPerfMs)
          : Date.now();
        const capturedElapsedMs = Math.max(
          0,
          Math.round(estServerNow - startedAtMs),
        );

        setSaveChip("unsaved");
        void enqueueAnswer({
          key: `${attemptId}:${aqId}`,
          attemptId,
          attemptQuestionId: aqId,
          selectedOptionIds: next.selectedOptionIds,
          textAnswer: next.textAnswer,
          markedForReview: next.markedForReview,
          seq: next.seq,
          capturedElapsedMs,
        }).then(async () => {
          const q = await getQueuedAnswers(attemptId);
          setQueuedCount(q.length);
        });

        if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
        flushTimerRef.current = setTimeout(() => {
          void flushQueue();
        }, 600);
        return { ...prev, [aqId]: next };
      });
    },
    [attemptId, flushQueue, startedAtMs],
  );

  // Flush the durable queue first. Never submit while answers exist only on this device.
  const flushAllAndSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    const remaining = await flushQueue();
    if (remaining > 0) {
      setConfirmSubmit(false);
      setOfflineBlock(remaining);
      return;
    }
    submitMutation.mutate();
  }, [flushQueue, submitMutation, submitting]);

  // Time-up: sync, then submit; keep retrying quietly while offline. The server
  // also finalises lazily at the deadline, so nothing is lost if this never succeeds.
  const autoSubmit = useCallback(async () => {
    setTimeUp(true);
    const retry = () => {
      if (autoRetryRef.current) clearTimeout(autoRetryRef.current);
      autoRetryRef.current = setTimeout(
        () => void autoSubmitRef.current(),
        4000,
      );
    };
    const remaining = await flushQueue();
    if (remaining > 0) return retry();
    try {
      const res = await api<SubmitResult>(`/api/attempts/${attemptId}/submit`, {
        method: "POST",
      });
      onSubmitted(res);
    } catch (e) {
      if (e instanceof ApiClientError && e.status !== 0) {
        // Server already finalised it (e.g. 409): show the submitted state.
        qc.invalidateQueries({ queryKey: ["attempt", attemptId] });
        return;
      }
      retry();
    }
    // onSubmitted only touches state setters and the query client.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, flushQueue, qc]);

  useEffect(() => {
    autoSubmitRef.current = autoSubmit;
  }, [autoSubmit]);

  useEffect(
    () => () => {
      if (autoRetryRef.current) clearTimeout(autoRetryRef.current);
    },
    [],
  );

  // Warn before leaving while answers exist only on this device.
  useEffect(() => {
    if (queuedCount === 0) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [queuedCount]);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
    else
      void document.documentElement
        .requestFullscreen()
        .catch(() =>
          toast.error("Full screen is not available in this browser."),
        );
  }

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
        void autoSubmit();
      }
    }, 500);
    return () => clearInterval(id);
  }, [attempt, submittedResult, autoSubmit]);

  const net = useNetworkStatus({
    enabled: attempt.status === "IN_PROGRESS" && !submittedResult,
    onDisconnect: () => {
      if (!attempt.isSandbox) {
        void api(`/api/attempts/${attemptId}/incidents`, {
          method: "POST",
          body: { type: "DISCONNECT" },
        }).catch(() => {});
      }
    },
    onReconnect: (offlineSeconds) => {
      backoffRef.current = 2000;
      if (autoSubmittedRef.current) void autoSubmitRef.current();
      else void flushQueue();
      if (!attempt.isSandbox) {
        void api(`/api/attempts/${attemptId}/incidents`, {
          method: "POST",
          body: { type: "RECONNECT", details: { offlineSeconds } },
        }).catch(() => {});
      }
    },
  });

  const resetSandbox = useMutation({
    mutationFn: () =>
      api<{ attemptId: string }>(`/api/exams/${attempt.examId}/sandbox`, {
        method: "POST",
        body: { reset: true },
      }),
    onSuccess: (r) => {
      router.push(`/attempts/${r.attemptId}`);
    },
    onError: (e) => toast.error(e.message),
  });

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
    if (
      attempt.status !== "IN_PROGRESS" ||
      attempt.isSandbox ||
      submittedResult
    )
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

  // Move to a question: page in single mode, smooth-scroll in scrolling mode.
  const jumpTo = useCallback(
    (i: number) => {
      const n = Math.max(0, Math.min(attempt.questions.length - 1, i));
      setIndex(n);
      if (prefs.layout === "scroll")
        document
          .getElementById(`q-${n}`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [attempt.questions.length, prefs.layout],
  );

  // Scrolling mode: highlight the question currently in view.
  useEffect(() => {
    if (prefs.layout !== "scroll" || reviewMode) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries)
          if (en.isIntersecting)
            setIndex(Number((en.target as HTMLElement).dataset.qindex));
      },
      { rootMargin: "-35% 0px -60% 0px" },
    );
    document.querySelectorAll("[data-qindex]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [prefs.layout, reviewMode, attempt.questions.length]);

  // Keyboard shortcuts: Left/Right navigate, 1-9 select option, f flag (disabled while typing in textarea/input).
  useEffect(() => {
    if (
      !attempt ||
      attempt.status !== "IN_PROGRESS" ||
      reviewMode ||
      confirmSubmit
    )
      return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;
      if (!attempt || !currentQuestion) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        jumpTo(index + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        jumpTo(index - 1);
      } else if ((e.key === "s" || e.key === "S") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setScratchpadOpen((o) => !o);
      } else if (e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        updateDraft(currentQuestion.id, (cur) => ({
          selectedOptionIds: cur.selectedOptionIds,
          textAnswer: cur.textAnswer,
          markedForReview: !cur.markedForReview,
        }));
      } else if (currentQuestion.type !== "WRITTEN" && /^[1-9]$/.test(e.key)) {
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
  }, [
    attempt,
    currentQuestion,
    reviewMode,
    confirmSubmit,
    updateDraft,
    jumpTo,
    index,
  ]);

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

  // Submitted state screen: a printable receipt (also what the back button lands on).
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

  const ms = remainingMs ?? 0;
  const urgency =
    ms <= 60_000
      ? "border-destructive bg-destructive/15 text-destructive"
      : ms <= 5 * 60_000
        ? "border-warning bg-warning/15 text-warning"
        : ms <= 10 * 60_000
          ? "border-warning/60 bg-warning/10 text-warning"
          : "border-border bg-card text-foreground";

  const renderQuestion = (
    q: AttemptState["questions"][number],
    i: number,
    single: boolean,
  ) => {
    const d = drafts[q.id];
    if (!d) return null;
    return (
      <Card
        id={`q-${i}`}
        data-qindex={i}
        className={
          single
            ? "scroll-mt-24"
            : "scroll-mt-6 rounded-none border-0 bg-transparent shadow-none"
        }
      >
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
          <div>
            <h2
              ref={single ? headingRef : undefined}
              tabIndex={-1}
              className="text-base font-semibold outline-none"
            >
              Question {i + 1} of {attempt.questions.length}
            </h2>
            <p className="text-muted-foreground text-xs">
              {TYPE_LABEL[q.type]} · {q.marks} mark
              {q.marks === 1 ? "" : "s"}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant={d.markedForReview ? "secondary" : "outline"}
            onClick={() =>
              updateDraft(q.id, (cur) => ({
                selectedOptionIds: cur.selectedOptionIds,
                textAnswer: cur.textAnswer,
                markedForReview: !cur.markedForReview,
              }))
            }
          >
            <Flag
              className={`h-3.5 w-3.5 ${d.markedForReview ? "text-warning fill-current" : ""}`}
            />
            {d.markedForReview ? "Flagged" : "Flag for review"}
          </Button>
        </CardHeader>

        <CardContent className="space-y-5">
          <p className="q-text whitespace-pre-wrap">{q.body}</p>

          {q.type === "WRITTEN" ? (
            <div className="space-y-1.5">
              <label
                htmlFor={`written-${q.id}`}
                className="text-sm font-medium"
              >
                Your answer
              </label>
              <textarea
                id={`written-${q.id}`}
                rows={8}
                maxLength={10_000}
                placeholder="Type your response here..."
                className="q-text border-input bg-background focus-visible:border-primary focus-visible:ring-primary/20 w-full rounded-lg border px-3 py-2 focus-visible:ring-4 focus-visible:outline-none"
                value={d.textAnswer}
                onChange={(e) => {
                  const val = e.target.value;
                  updateDraft(q.id, (cur) => ({
                    selectedOptionIds: [],
                    textAnswer: val,
                    markedForReview: cur.markedForReview,
                  }));
                }}
              />
              <p className="text-muted-foreground text-right text-xs">
                {d.textAnswer.length} / 10,000 characters
              </p>
            </div>
          ) : (
            <fieldset className="space-y-2.5">
              <legend className="sr-only">Answer choices</legend>
              {q.options.map((opt, optIdx) => {
                const checked = d.selectedOptionIds.includes(opt.id);
                return (
                  <label
                    key={opt.id}
                    className={`q-text flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-[background-color,border-color,box-shadow,transform] duration-150 motion-safe:active:scale-[0.995] ${
                      checked
                        ? "border-primary/70 bg-accent/50 shadow-elev-1"
                        : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                    }`}
                  >
                    <input
                      type={q.type === "MCQ_SINGLE" ? "radio" : "checkbox"}
                      name={`q-${q.id}`}
                      className="choice"
                      checked={checked}
                      onChange={() =>
                        updateDraft(q.id, (cur) => {
                          if (q.type === "MCQ_SINGLE") {
                            return {
                              ...cur,
                              selectedOptionIds: [opt.id],
                            };
                          }
                          const next = cur.selectedOptionIds.includes(opt.id)
                            ? cur.selectedOptionIds.filter((x) => x !== opt.id)
                            : [...cur.selectedOptionIds, opt.id];
                          return { ...cur, selectedOptionIds: next };
                        })
                      }
                    />
                    <span className="flex-1">{opt.body}</span>
                    <kbd
                      className={`hidden h-6 min-w-6 items-center justify-center rounded border px-1.5 font-mono text-[11px] sm:inline-flex ${
                        checked
                          ? "border-primary/40 text-primary"
                          : "text-muted-foreground"
                      }`}
                      aria-hidden="true"
                    >
                      {optIdx + 1}
                    </kbd>
                  </label>
                );
              })}
              {q.type === "MCQ_SINGLE" && d.selectedOptionIds.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    updateDraft(q.id, (cur) => ({
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

          {single && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={i === 0}
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
                {i < attempt.questions.length - 1 && (
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
          )}
        </CardContent>
      </Card>
    );
  };

  // One visual language for question tiles (side panel, dialog and bottom bar).
  const tileClass = (active: boolean, done: boolean) =>
    `relative flex h-9 items-center justify-center rounded-md text-[13px] font-medium tabular-nums transition-[background-color,color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:active:scale-95 ${
      active
        ? "bg-primary text-primary-foreground shadow-elev-1 ring-2 ring-primary/30 ring-offset-1 ring-offset-card"
        : done
          ? "border border-primary/50 bg-primary/10 text-primary font-semibold hover:bg-primary/15"
          : "border border-dashed border-foreground/25 bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground"
    }`;
  const flagDot = (
    <span
      aria-hidden="true"
      className="bg-warning ring-card absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ring-2"
    />
  );
  const progressPct = Math.round(
    (counts.answered / Math.max(1, attempt.questions.length)) * 100,
  );

  const paletteList = (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold">Questions</span>
          <span className="text-muted-foreground text-xs tabular-nums">
            <span className="text-foreground font-semibold">
              {counts.answered}
            </span>
            /{attempt.questions.length} answered
          </span>
        </div>
        <div
          className="bg-muted h-1.5 overflow-hidden rounded-full"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Answered"
        >
          <div
            className="bg-primary h-full rounded-full transition-[width] duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
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
                setPaletteOpen(false);
                requestAnimationFrame(() => jumpTo(i));
              }}
              className={tileClass(active, done)}
            >
              {i + 1}
              {flagged && flagDot}
            </button>
          );
        })}
      </div>

      <ul className="text-muted-foreground grid grid-cols-2 gap-x-3 gap-y-1.5 border-t pt-3 text-xs">
        <li className="flex items-center gap-2">
          <span
            className="border-primary/50 bg-primary/10 h-3 w-3 rounded-[3px] border"
            aria-hidden="true"
          />
          Answered
        </li>
        <li className="flex items-center gap-2">
          <span
            className="border-foreground/25 bg-card h-3 w-3 rounded-[3px] border border-dashed"
            aria-hidden="true"
          />
          Not answered
        </li>
        <li className="flex items-center gap-2">
          <span
            className="bg-primary h-3 w-3 rounded-[3px]"
            aria-hidden="true"
          />
          Current
        </li>
        <li className="flex items-center gap-2">
          <span
            className="bg-warning h-2 w-2 rounded-full"
            aria-hidden="true"
          />
          Flagged ({counts.flagged})
        </li>
      </ul>
    </div>
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

      {attempt.isSandbox && (
        <div className="border-warning/30 bg-warning/8 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm">
          <span className="flex items-center gap-2.5">
            <span className="bg-warning/15 text-warning flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
              <FlaskConical className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>
              <span className="font-semibold">Sandbox preview</span>
              <span className="text-muted-foreground">
                {" "}
                · Not counted in results, statistics or reports.
              </span>
            </span>
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={resetSandbox.isPending}
              onClick={() => resetSandbox.mutate()}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset preview
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/exams/${attempt.examId}`}>Exit sandbox</Link>
            </Button>
          </div>
        </div>
      )}

      {net.state !== "online" && (
        <div
          role="alert"
          className={`animate-page-in flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium ${
            net.state === "offline"
              ? "border-destructive bg-destructive/15 text-destructive"
              : "border-warning bg-warning/15 text-warning"
          }`}
        >
          <WifiOff className="h-4 w-4 shrink-0" />
          {net.state === "offline"
            ? "Connection lost. Your timer continues on the server; keep working and reconnect before the recovery window closes."
            : `Unstable connection (${net.latencyMs ?? "?"} ms). Saves may take longer than usual.`}
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
              onClick={() => setDismissedAnn((prev) => new Set(prev).add(a.id))}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}

      {/* Top exam bar */}
      <div className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">
            {attempt.examTitle}
          </h1>
          <p className="text-muted-foreground text-xs">
            Question {index + 1} of {attempt.questions.length}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            role="status"
            aria-live="polite"
            className={
              net.state === "offline" || saveChip === "error"
                ? "bg-destructive/15 text-destructive"
                : queuedCount > 0
                  ? "bg-warning/15 text-warning"
                  : saveChip === "saved"
                    ? "bg-success/15 text-success"
                    : "bg-muted text-muted-foreground"
            }
          >
            {net.state === "offline"
              ? queuedCount > 0
                ? `Offline · Queued ${queuedCount}`
                : "Offline"
              : queuedCount > 0
                ? saveChip === "saving"
                  ? `Syncing ${queuedCount}...`
                  : `Queued ${queuedCount}`
                : saveChip === "saving"
                  ? "Saving..."
                  : "Saved"}
          </Badge>

          <div
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-sm font-semibold ${urgency} ${
              prefs.timerStyle === "subtle" && ms > 5 * 60_000
                ? "opacity-70"
                : ""
            }`}
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

          <Tooltip
            content={
              <>
                Scratchpad <span className="opacity-60">· S</span>
              </>
            }
            side="bottom"
          >
            <Button
              size="sm"
              variant="outline"
              aria-pressed={scratchpadOpen}
              onClick={() => setScratchpadOpen((o) => !o)}
            >
              <NotebookPen className="h-4 w-4" />
              <span className="hidden sm:inline">Scratchpad</span>
            </Button>
          </Tooltip>

          <Tooltip
            content={fullscreen ? "Exit full screen" : "Full screen"}
            side="bottom"
          >
            <Button
              size="icon"
              tooltip={false}
              variant="ghost"
              aria-label={fullscreen ? "Exit full screen" : "Enter full screen"}
              onClick={toggleFullscreen}
            >
              {fullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </Tooltip>

          <Tooltip content="Workspace settings" side="bottom">
            <Button
              size="icon"
              tooltip={false}
              variant="ghost"
              aria-label="Workspace settings"
              onClick={() => setPrefsOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </Tooltip>

          <Tooltip content="Question navigator" side="bottom">
            <Button
              size="icon"
              tooltip={false}
              variant="outline"
              className={
                prefs.palettePosition === "side" ? "lg:hidden" : "hidden"
              }
              aria-label="Open question palette"
              onClick={() => setPaletteOpen(true)}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </Tooltip>

          <Tooltip
            content={
              <>
                Keyboard shortcuts <span className="opacity-60">· ?</span>
              </>
            }
            side="bottom"
            align="end"
          >
            <Button
              size="icon"
              tooltip={false}
              variant="ghost"
              aria-label="Keyboard shortcuts"
              onClick={() => setHelpOpen(true)}
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Main grid: Question / Review panel + Desktop Palette */}
      <div
        data-qsize={prefs.fontSize}
        className={`grid gap-6 ${
          prefs.palettePosition === "side" ? "lg:grid-cols-[1fr_240px]" : ""
        }`}
      >
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
                            requestAnimationFrame(() => jumpTo(i));
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
          ) : prefs.layout === "scroll" ? (
            <article
              aria-label="Exam paper"
              className="bg-card shadow-elev-1 overflow-hidden rounded-lg border"
            >
              <header className="border-b px-5 pt-6 pb-4 sm:px-6">
                <p className="text-muted-foreground font-mono text-[11px]">
                  Answer sheet
                </p>
                <p className="font-semibold">{attempt.examTitle}</p>
              </header>
              <div className="divide-y divide-dashed">
                {attempt.questions.map((q, i) => (
                  <div key={q.id}>{renderQuestion(q, i, false)}</div>
                ))}
              </div>
              <footer className="bg-card/80 flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4 sm:px-6">
                <p className="text-muted-foreground text-sm">
                  End of paper · {counts.answered} of {attempt.questions.length}{" "}
                  answered
                  {counts.flagged > 0 && ` · ${counts.flagged} flagged`}
                </p>
                <Button onClick={() => setReviewMode(true)}>
                  Review &amp; submit
                </Button>
              </footer>
            </article>
          ) : (
            currentQuestion && renderQuestion(currentQuestion, index, true)
          )}
        </div>

        {/* Desktop side palette */}
        {prefs.palettePosition === "side" && (
          <aside className="hidden lg:block" aria-label="Question navigation">
            <Card className="sticky top-4 p-4">
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
        )}
      </div>

      {prefs.palettePosition === "bottom" && (
        <nav
          aria-label="Question navigation"
          className="bg-card shadow-elev-3 fixed inset-x-0 bottom-0 z-30 border-t"
        >
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
            <div className="flex flex-1 gap-1.5 overflow-x-auto py-1">
              {attempt.questions.map((q, i) => {
                const d = drafts[q.id];
                const done = isAnswered(d);
                const active = !reviewMode && i === index;
                return (
                  <button
                    key={q.id}
                    type="button"
                    aria-label={`Question ${i + 1}${done ? ", answered" : ", unanswered"}${d?.markedForReview ? ", flagged" : ""}`}
                    aria-current={active ? "step" : undefined}
                    onClick={() => {
                      setReviewMode(false);
                      requestAnimationFrame(() => jumpTo(i));
                    }}
                    className={`${tileClass(active, done)} min-w-9 shrink-0 px-2`}
                  >
                    {i + 1}
                    {d?.markedForReview && flagDot}
                  </button>
                );
              })}
            </div>
            <Button size="sm" onClick={() => setReviewMode(true)}>
              Review &amp; submit
            </Button>
          </div>
        </nav>
      )}

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
            <Button
              variant="outline"
              disabled={submitting || submitMutation.isPending}
              onClick={() => setConfirmSubmit(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={submitting || submitMutation.isPending}
              aria-busy={submitting || submitMutation.isPending}
              onClick={() => void flushAllAndSubmit()}
            >
              {(submitting || submitMutation.isPending) && <Spinner />}
              {submitting || submitMutation.isPending
                ? "Submitting..."
                : "Confirm submit"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ScratchpadDrawer
        attemptId={attemptId}
        initialText={attempt.scratchpad}
        open={scratchpadOpen}
        onOpenChange={setScratchpadOpen}
      />

      <PreferencesDialog open={prefsOpen} onOpenChange={setPrefsOpen} />

      {timeUp && (
        <div className="bg-background/90 fixed inset-0 z-50 flex items-center justify-center p-4">
          <Card
            className="animate-page-in max-w-md space-y-3 p-6 text-center"
            role="alertdialog"
            aria-live="assertive"
          >
            <Clock
              className="text-primary mx-auto h-8 w-8"
              aria-hidden="true"
            />
            <h2 className="text-lg font-semibold">Time is up</h2>
            <p className="text-muted-foreground text-sm">
              {net.state === "offline" || queuedCount > 0
                ? "Waiting for your connection to send the last answers. Keep this page open. Answers you gave before the deadline will still be accepted."
                : "Submitting your exam…"}
            </p>
            <Spinner className="mx-auto" />
          </Card>
        </div>
      )}

      <Dialog
        open={offlineBlock > 0}
        onOpenChange={(o) => !o && setOfflineBlock(0)}
      >
        <DialogContent
          title="Your answers aren't on the server yet"
          description="We didn't submit, so nothing is lost."
        >
          <div className="space-y-4 text-sm">
            <p>
              <b>{offlineBlock}</b> answer{offlineBlock === 1 ? " is" : "s are"}{" "}
              saved on this device but haven&apos;t reached the server.
              Reconnect, wait for the badge to show
              <b> Saved</b>, then submit again. Your timer keeps running on the
              server.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOfflineBlock(0)}>
                Keep working
              </Button>
              <Button
                onClick={() => {
                  setOfflineBlock(0);
                  void flushAllAndSubmit();
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Try again
              </Button>
            </div>
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
              <span>Show this list</span>
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                ?
              </code>
            </li>
            <li className="flex justify-between">
              <span>Open / close scratchpad</span>
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                S
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

function SubmissionReceipt({
  examTitle,
  isSandbox,
  reason,
  receiptCode,
  submittedAt,
  answered,
  total,
  needsReview,
}: {
  examTitle: string;
  isSandbox: boolean;
  reason: string;
  receiptCode: string | null;
  submittedAt: string | null;
  answered: number;
  total: number;
  needsReview: boolean;
}) {
  const at = submittedAt ? new Date(submittedAt) : null;
  return (
    <Card className="mx-auto max-w-xl print:border-0 print:shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="text-success h-5 w-5" />
          Submission receipt
        </CardTitle>
        <p className="text-muted-foreground text-sm">{examTitle}</p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          {reason === "TIMEOUT"
            ? "Time ran out on the server, so your attempt was submitted automatically with every answer that had been saved."
            : "Your answers have been recorded. Results will appear on your home page once the examiner publishes them."}
          {isSandbox && " (Sandbox preview: not a real submission.)"}
        </p>
        <div className="rounded-md border-2 border-dashed p-4 text-center">
          <p className="text-muted-foreground text-xs">Confirmation code</p>
          <p
            className="font-mono text-2xl font-semibold tracking-widest"
            data-testid="receipt-code"
          >
            {receiptCode ?? "—"}
          </p>
        </div>
        <dl className="bg-muted grid grid-cols-2 gap-3 rounded-md p-3">
          <div>
            <dt className="text-muted-foreground text-xs">Submitted at</dt>
            <dd className="font-semibold">
              {at
                ? at.toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "medium",
                  })
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">
              Questions answered
            </dt>
            <dd className="font-semibold">
              {answered} / {total}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">How</dt>
            <dd className="font-semibold">
              {reason === "TIMEOUT"
                ? "Auto-submitted at time limit"
                : "Submitted by you"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Status</dt>
            <dd className="font-semibold">
              {needsReview ? "Awaiting written grading" : "Auto-graded"}
            </dd>
          </div>
        </dl>
        <p className="text-muted-foreground text-xs">
          Keep this code. If there is ever a question about your submission, it
          identifies this exact attempt and time.
        </p>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button asChild>
            <Link href="/dashboard">Return to home</Link>
          </Button>
          {receiptCode && (
            <Button
              variant="outline"
              onClick={() => {
                void navigator.clipboard
                  ?.writeText(receiptCode)
                  .then(() => toast.success("Code copied"))
                  .catch(() => toast.error("Could not copy"));
              }}
            >
              Copy code
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            Print receipt
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
