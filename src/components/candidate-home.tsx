"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Info,
  Lock,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton, Spinner } from "@/components/ui/misc";
import { EmptyState, PageHeader } from "@/components/ui/blocks";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { SystemCheckCompact, useSystemChecks } from "@/components/system-check";
import type { AttemptState, MyExamItem } from "@/shared/schemas/attempt";

const STATUS: Record<
  MyExamItem["accessStatus"],
  { label: string; chip: string; dot: string; live?: boolean }
> = {
  CAN_START: {
    label: "Available",
    chip: "bg-success/12 text-success",
    dot: "bg-success",
    live: true,
  },
  IN_PROGRESS: {
    label: "In progress",
    chip: "bg-success/12 text-success",
    dot: "bg-success",
    live: true,
  },
  UPCOMING: {
    label: "Upcoming",
    chip: "bg-warning/12 text-warning",
    dot: "bg-warning",
    live: true,
  },
  SUBMITTED: {
    label: "Submitted",
    chip: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/60",
  },
  MISSED: {
    label: "Closed",
    chip: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/60",
  },
};

/** Status chip; open/upcoming exams get a softly fading dot (disabled for reduced motion). */
function StatusChip({ status }: { status: MyExamItem["accessStatus"] }) {
  const s = STATUS[status] ?? STATUS.MISSED;
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-[5px] px-2 text-xs font-medium",
        s.chip,
      )}
    >
      <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
        {s.live && (
          <span
            className={cn(
              "absolute inset-0 rounded-full motion-safe:animate-ping",
              s.dot,
              "opacity-60",
            )}
          />
        )}
        <span
          className={cn(
            "relative h-1.5 w-1.5 rounded-full",
            s.dot,
            s.live && "motion-safe:animate-pulse",
          )}
        />
      </span>
      {s.label}
    </span>
  );
}

function ExamCard({
  item,
  onStart,
  startingId,
}: {
  item: MyExamItem;
  onStart: (examId: string) => void;
  startingId: string | null;
}) {
  const isStarting = startingId === item.examId;
  const footerText =
    item.accessStatus === "CAN_START" || item.accessStatus === "IN_PROGRESS"
      ? {
          icon: Clock,
          text: `Closes ${format(new Date(item.endsAt), "MMM d, p")}`,
        }
      : item.accessStatus === "UPCOMING"
        ? {
            icon: Clock,
            text:
              item.accessReason ||
              `Opens ${format(new Date(item.startsAt), "MMM d, p")}`,
          }
        : item.accessStatus === "SUBMITTED"
          ? {
              icon: CheckCircle2,
              text:
                item.resultsPublished && item.totalScore !== null
                  ? `Score ${item.totalScore} / ${item.totalMarks}`
                  : item.accessReason,
            }
          : { icon: Lock, text: item.accessReason };

  return (
    <Card interactive className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base leading-snug">{item.title}</CardTitle>
          <StatusChip status={item.accessStatus} />
        </div>
        <p className="text-muted-foreground text-xs">
          {item.questionCount} questions · {item.totalMarks} marks ·{" "}
          {item.durationMinutes} min
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 text-sm">
        <dl className="text-muted-foreground grid grid-cols-[3.5rem_1fr] gap-y-0.5 text-xs">
          <dt>Opens</dt>
          <dd className="text-foreground/80 tabular-nums">
            {format(new Date(item.startsAt), "PP p")}
          </dd>
          <dt>Closes</dt>
          <dd className="text-foreground/80 tabular-nums">
            {format(new Date(item.endsAt), "PP p")}
          </dd>
        </dl>

        {item.instructions && (
          <p className="text-muted-foreground line-clamp-2 text-xs">
            {item.instructions}
          </p>
        )}
        {item.changedAt && (
          <p className="bg-warning/10 text-warning rounded-md px-2.5 py-1.5 text-xs">
            Updated by the examiner on{" "}
            {format(new Date(item.changedAt), "PP p")}. Check the schedule and
            instructions.
          </p>
        )}

        {/* Footer: context on the left, the one action on the right. */}
        <div className="mt-auto flex min-h-9 items-center justify-between gap-3 border-t pt-3">
          <span className="text-muted-foreground inline-flex min-w-0 items-center gap-1.5 text-xs">
            <footerText.icon
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                item.accessStatus === "SUBMITTED" && "text-success",
              )}
              aria-hidden="true"
            />
            <span className="truncate">{footerText.text}</span>
          </span>

          {item.accessStatus === "CAN_START" && (
            <Button
              size="sm"
              className="shrink-0"
              disabled={startingId !== null}
              aria-busy={isStarting}
              onClick={() => onStart(item.examId)}
            >
              {isStarting ? <Spinner /> : <Play className="h-3.5 w-3.5" />}
              {isStarting ? "Starting…" : "Start exam"}
            </Button>
          )}
          {item.accessStatus === "IN_PROGRESS" && item.attemptId && (
            <Button
              size="sm"
              className="shrink-0"
              disabled={startingId !== null}
              aria-busy={isStarting}
              onClick={() => onStart(item.examId)}
            >
              {isStarting ? (
                <Spinner />
              ) : (
                <ArrowRight className="h-3.5 w-3.5" />
              )}
              {isStarting ? "Opening…" : "Resume"}
            </Button>
          )}
          {item.accessStatus === "SUBMITTED" &&
            item.resultsPublished &&
            item.attemptId && (
              <Button asChild size="sm" variant="outline" className="shrink-0">
                <Link href={`/attempts/${item.attemptId}/result`}>
                  View result
                </Link>
              </Button>
            )}
          {item.accessStatus === "SUBMITTED" &&
            !item.resultsPublished &&
            item.receiptCode && (
              <span
                className="text-muted-foreground shrink-0 font-mono text-xs"
                title="Submission receipt code"
              >
                {item.receiptCode}
              </span>
            )}
        </div>
      </CardContent>
    </Card>
  );
}

export function CandidateHome({ firstName }: { firstName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<MyExamItem | null>(null);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ["my-exams"],
    queryFn: () => api<MyExamItem[]>("/api/my/exams"),
    refetchOnMount: "always",
  });

  const start = useMutation({
    mutationFn: (examId: string) =>
      api<AttemptState>(`/api/exams/${examId}/start`, { method: "POST" }),
    onSuccess: (attempt) => {
      // Keep button locked in loading state until navigation completes.
      router.push(`/attempts/${attempt.id}`);
    },
    onError: (e) => {
      setLaunchingId(null);
      toast.error(e.message);
      void list.refetch();
    },
  });

  function handleLaunch(examId: string) {
    if (launchingId !== null) return;
    setLaunchingId(examId);
    const existing = list.data?.find(
      (e) =>
        e.examId === examId && e.accessStatus === "IN_PROGRESS" && e.attemptId,
    );
    if (existing?.attemptId) {
      router.push(`/attempts/${existing.attemptId}`);
      return;
    }
    start.mutate(examId);
  }

  const exams = list.data ?? [];
  const available = exams.filter(
    (e) => e.accessStatus === "CAN_START" || e.accessStatus === "IN_PROGRESS",
  );
  const upcoming = exams.filter((e) => e.accessStatus === "UPCOMING");
  const completed = exams.filter(
    (e) => e.accessStatus === "SUBMITTED" || e.accessStatus === "MISSED",
  );

  return (
    <>
      <PageHeader
        title={`Welcome, ${firstName}`}
        subtitle="Your assigned examinations. Timers are enforced by the server."
      />

      <Dialog
        open={confirming !== null}
        onOpenChange={(o) => !o && launchingId === null && setConfirming(null)}
      >
        {confirming && (
          <DialogContent
            className="max-w-lg"
            title={confirming.title}
            description="The timer starts when you press Start and can't be paused."
          >
            <StartExamBody
              key={confirming.examId}
              exam={confirming}
              starting={launchingId === confirming.examId}
              onCancel={() => setConfirming(null)}
              onStart={() => handleLaunch(confirming.examId)}
            />
          </DialogContent>
        )}
      </Dialog>

      {list.isPending ? (
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : list.isError ? (
        <EmptyState
          title="Could not load your exams"
          text={list.error.message}
          action={<Button onClick={() => list.refetch()}>Try again</Button>}
        />
      ) : exams.length === 0 ? (
        <EmptyState
          title="No exams assigned yet"
          text="When an examiner enrolls you in a published exam, it will appear here."
        />
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">
              Available now ({available.length})
            </h2>
            {available.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No exams are open for you right now.
              </p>
            ) : (
              <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {available.map((item) => (
                  <ExamCard
                    key={item.examId}
                    item={item}
                    startingId={launchingId}
                    onStart={(id) => {
                      const target = available.find((x) => x.examId === id);
                      if (!target) return;
                      if (target.accessStatus === "IN_PROGRESS") {
                        handleLaunch(id);
                      } else {
                        setConfirming(target);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          {upcoming.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">
                Upcoming ({upcoming.length})
              </h2>
              <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {upcoming.map((item) => (
                  <ExamCard
                    key={item.examId}
                    item={item}
                    startingId={null}
                    onStart={() => {}}
                  />
                ))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">
                Completed ({completed.length})
              </h2>
              <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {completed.map((item) => (
                  <ExamCard
                    key={item.examId}
                    item={item}
                    startingId={null}
                    onStart={() => {}}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}

/** Pre-start sheet: exam summary, instructions, device checks and acknowledgment. Keyed per exam. */
function StartExamBody({
  exam,
  starting,
  onCancel,
  onStart,
}: {
  exam: MyExamItem;
  starting: boolean;
  onCancel: () => void;
  onStart: () => void;
}) {
  const sys = useSystemChecks();
  const stats = [
    { label: "Duration", value: `${exam.durationMinutes} min` },
    { label: "Questions", value: exam.questionCount },
    { label: "Marks", value: exam.totalMarks },
  ];
  return (
    <div className="space-y-5 text-sm">
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="bg-muted/60 rounded-lg px-3 py-2.5">
              <p className="text-muted-foreground text-[11px] font-medium">
                {s.label}
              </p>
              <p className="mt-0.5 text-lg font-semibold tracking-tight tabular-nums">
                {s.value}
              </p>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          Window closes {format(new Date(exam.endsAt), "MMM d, p")}
        </p>
      </div>

      {exam.instructions && (
        <div className="space-y-1">
          <p className="text-muted-foreground text-[11px] font-medium">
            Instructions
          </p>
          <p className="max-h-24 overflow-y-auto leading-relaxed whitespace-pre-wrap">
            {exam.instructions}
          </p>
        </div>
      )}

      <SystemCheckCompact state={sys} />

      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <Tooltip
          content={
            <span className="block space-y-1 py-0.5">
              <span className="block">
                Lost connection? Keep working. Answers sync when you&apos;re
                back.
              </span>
              <span className="block">
                Tab switches and copy/paste are noted for your examiner, never
                auto-penalised.
              </span>
            </span>
          }
          side="top"
          align="start"
        >
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
          >
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
            How it works
          </button>
        </Tooltip>
        <div className="flex gap-2">
          <Button variant="outline" disabled={starting} onClick={onCancel}>
            Not yet
          </Button>
          <Button
            disabled={!sys.ready || starting}
            aria-busy={starting}
            onClick={onStart}
          >
            {starting ? <Spinner /> : <Play className="h-4 w-4" />}
            {starting ? "Starting…" : "Start exam"}
          </Button>
        </div>
      </div>
    </div>
  );
}
