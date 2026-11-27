"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowRight, CheckCircle2, Clock, Lock, Play, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Skeleton, Spinner } from "@/components/ui/misc";
import { EmptyState, PageHeader } from "@/components/ui/blocks";
import { PreferencesDialog } from "@/components/preferences-dialog";
import { api } from "@/lib/api-client";
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
    <Card className="flex flex-col justify-between">
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
              onClick={() => onStart(item.examId)}
            >
              {isStarting ? <Spinner /> : <Play className="h-3.5 w-3.5" />}
              Start exam
            </Button>
          )}
          {item.accessStatus === "IN_PROGRESS" && item.attemptId && (
            <Button asChild size="sm">
              <Link href={`/attempts/${item.attemptId}`}>
                Resume attempt
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
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
  const list = useQuery({
    queryKey: ["my-exams"],
    queryFn: () => api<MyExamItem[]>("/api/my/exams"),
  });

  const start = useMutation({
    mutationFn: (examId: string) =>
      api<AttemptState>(`/api/exams/${examId}/start`, { method: "POST" }),
    onSuccess: (attempt) => {
      router.push(`/attempts/${attempt.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

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
        actions={
          <Button variant="outline" onClick={() => setPrefsOpen(true)}>
            <SlidersHorizontal className="h-4 w-4" />
            Workspace settings
          </Button>
        }
      />
      <PreferencesDialog open={prefsOpen} onOpenChange={setPrefsOpen} />

      {list.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {available.map((item) => (
                  <ExamCard
                    key={item.examId}
                    item={item}
                    startingId={start.isPending ? start.variables : null}
                    onStart={(id) => start.mutate(id)}
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
