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
  Eye,
  FileText,
  Lock,
  Play,
  SlidersHorizontal,
  Timer,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Skeleton, Spinner } from "@/components/ui/misc";
import { EmptyState, PageHeader } from "@/components/ui/blocks";
import { PreferencesDialog } from "@/components/preferences-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { api } from "@/lib/api-client";
import { SystemCheckList, useSystemChecks } from "@/components/system-check";
import type { AttemptState, MyExamItem } from "@/shared/schemas/attempt";

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
  return (
    <Card interactive className="flex flex-col justify-between">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{item.title}</CardTitle>
          <Badge
            className={
              item.accessStatus === "CAN_START" ||
              item.accessStatus === "IN_PROGRESS"
                ? "bg-success/15 text-success shrink-0"
                : item.accessStatus === "UPCOMING"
                  ? "bg-warning/15 text-warning shrink-0"
                  : "bg-muted text-muted-foreground shrink-0"
            }
          >
            {item.accessStatus === "CAN_START"
              ? "Available"
              : item.accessStatus === "IN_PROGRESS"
                ? "In progress"
                : item.accessStatus === "UPCOMING"
                  ? "Upcoming"
                  : item.accessStatus === "SUBMITTED"
                    ? "Submitted"
                    : "Closed"}
          </Badge>
        </div>
        <p className="text-muted-foreground text-xs">
          {item.questionCount} questions · {item.totalMarks} marks ·{" "}
          {item.durationMinutes} min
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="text-muted-foreground space-y-0.5 text-xs">
          <div>Opens: {format(new Date(item.startsAt), "PP p")}</div>
          <div>Closes: {format(new Date(item.endsAt), "PP p")}</div>
        </div>

        {item.instructions && (
          <p className="text-muted-foreground line-clamp-2 text-xs">
            {item.instructions}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          {item.accessStatus === "CAN_START" && (
            <Button
              size="sm"
              disabled={startingId !== null}
              aria-busy={isStarting}
              onClick={() => onStart(item.examId)}
            >
              {isStarting ? <Spinner /> : <Play className="h-3.5 w-3.5" />}
              {isStarting ? "Starting exam..." : "Start exam"}
            </Button>
          )}
          {item.accessStatus === "IN_PROGRESS" && item.attemptId && (
            <Button
              size="sm"
              disabled={startingId !== null}
              aria-busy={isStarting}
              onClick={() => onStart(item.examId)}
            >
              {isStarting ? (
                <>
                  <Spinner />
                  Opening attempt...
                </>
              ) : (
                <>
                  Resume attempt
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          )}
          {item.accessStatus === "SUBMITTED" && (
            <div className="flex w-full items-center justify-between gap-2">
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="text-success h-4 w-4" />
                {item.resultsPublished && item.totalScore !== null
                  ? `Score: ${item.totalScore} / ${item.totalMarks}`
                  : item.accessReason}
              </span>
              {item.receiptCode && !item.resultsPublished && (
                <span className="text-muted-foreground font-mono text-xs" title="Submission receipt code">
                  {item.receiptCode}
                </span>
              )}
              {item.resultsPublished && item.attemptId && (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/attempts/${item.attemptId}/result`}>
                    View result
                  </Link>
                </Button>
              )}
            </div>
          )}
          {item.accessStatus === "UPCOMING" && (
            <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
              <Clock className="h-3.5 w-3.5" />
              {item.accessReason}
            </span>
          )}
          {item.accessStatus === "MISSED" && (
            <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
              <Lock className="h-3.5 w-3.5" />
              {item.accessReason}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function CandidateHome({ firstName }: { firstName: string }) {
  const router = useRouter();
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [confirming, setConfirming] = useState<MyExamItem | null>(null);
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
      (e) => e.examId === examId && e.accessStatus === "IN_PROGRESS" && e.attemptId,
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
        eyebrow="candidate"
        title={`Welcome, ${firstName}`}
        subtitle="Your assigned examinations. Timers are enforced by the server."
        actions={
          <Button variant="outline" onClick={() => setPrefsOpen(true)}>
            <SlidersHorizontal className="h-4 w-4" />
            Workspace settings
          </Button>
        }
      />
      <PreferencesDialog open={prefsOpen} onOpenChange={setPrefsOpen} />

      <Dialog
        open={confirming !== null}
        onOpenChange={(o) => !o && !start.isPending && setConfirming(null)}
      >
        {confirming && (
          <DialogContent
            className="max-w-xl"
            title={`Before you begin: ${confirming.title}`}
            description="The timer starts on the server the moment you press Start and cannot be paused."
          >
            <StartExamBody
              key={confirming.examId}
              exam={confirming}
              starting={start.isPending}
              onCancel={() => setConfirming(null)}
              onStart={() => start.mutate(confirming.examId)}
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
                    startingId={start.isPending ? start.variables : null}
                    onStart={(id) => {
                      setConfirming(available.find((x) => x.examId === id) ?? null);
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
  const [ack, setAck] = useState(false);
  const sys = useSystemChecks();
  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Timer, label: "Duration", value: `${exam.durationMinutes} min` },
          { icon: FileText, label: "Questions", value: exam.questionCount },
          { icon: CheckCircle2, label: "Total marks", value: exam.totalMarks },
        ].map((m) => (
          <div key={m.label} className="bg-muted/60 rounded-lg p-3">
            <m.icon className="text-primary mb-1 h-4 w-4" aria-hidden="true" />
            <p className="text-muted-foreground text-xs">{m.label}</p>
            <p className="font-semibold tabular-nums">{m.value}</p>
          </div>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        Closes {format(new Date(exam.endsAt), "PP p")}. If the exam window closes first, your time ends then.
      </p>
      {exam.instructions && (
        <div className="max-h-44 overflow-y-auto rounded-lg border p-3">
          <p className="mb-1 text-xs font-semibold tracking-wide uppercase">Instructions</p>
          <p className="whitespace-pre-wrap">{exam.instructions}</p>
        </div>
      )}
      <ul className="space-y-2">
        <li className="flex gap-2.5">
          <WifiOff className="text-primary mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>If your connection drops, keep working. Answers are kept on this device and sync when you reconnect.</span>
        </li>
        <li className="flex gap-2.5">
          <Eye className="text-primary mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Switching tabs, leaving full screen, copy/paste and disconnects are recorded for your examiner. They are advisory notes, never automatic penalties.</span>
        </li>
      </ul>
      <SystemCheckList state={sys} />
      <label className="hover:bg-accent/40 flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors">
        <input
          type="checkbox"
          className="accent-primary mt-0.5 h-4 w-4"
          checked={ack}
          onChange={(e) => setAck(e.target.checked)}
        />
        <span>I have read the instructions and I am ready to start.</span>
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={starting} onClick={onCancel}>
          Not yet
        </Button>
        <Button disabled={!ack || !sys.ready || starting} onClick={onStart}>
          {starting ? <Spinner /> : <Play className="h-4 w-4" />}
          Start exam
        </Button>
      </div>
    </div>
  );
}
