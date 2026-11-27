"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { EmptyState, PageHeader } from "@/components/ui/blocks";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ExamSection } from "@/components/dashboard/candidate/exam-section";
import { StartExamBody } from "@/components/dashboard/candidate/start-exam-body";
import { useExamLauncher } from "@/components/dashboard/candidate/use-exam-launcher";
import { examsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { MyExamItem } from "@/shared/schemas/attempt";

/** Candidate home: assigned exams grouped by availability, with a pre-start confirmation sheet. */
export function CandidateHome({
  firstName,
  userId,
}: {
  firstName: string;
  /** Scopes the notification "Clear" to this account (optional). */
  userId?: string;
}) {
  const [confirming, setConfirming] = useState<MyExamItem | null>(null);
  const list = useQuery({
    queryKey: qk.myExams,
    queryFn: examsApi.mine,
    refetchOnMount: "always",
  });
  const { launchingId, launch } = useExamLauncher(list.data, list.refetch);

  const exams = list.data ?? [];
  const available = exams.filter(
    (e) => e.accessStatus === "CAN_START" || e.accessStatus === "IN_PROGRESS",
  );
  const upcoming = exams.filter((e) => e.accessStatus === "UPCOMING");
  const completed = exams.filter(
    (e) => e.accessStatus === "SUBMITTED" || e.accessStatus === "MISSED",
  );

  // Resume goes straight in; a fresh start asks for confirmation first.
  function openExam(examId: string) {
    const target = available.find((x) => x.examId === examId);
    if (!target) return;
    if (target.accessStatus === "IN_PROGRESS") launch(examId);
    else setConfirming(target);
  }

  return (
    <>
      <PageHeader
        title={`Welcome, ${firstName}`}
        subtitle="Your assigned examinations. Timers are enforced by the server."
        actions={<NotificationBell userId={userId} />}
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
              onStart={() => launch(confirming.examId)}
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
          <ExamSection
            title="Available now"
            items={available}
            emptyText="No exams are open for you right now."
            startingId={launchingId}
            onStart={openExam}
          />
          {upcoming.length > 0 && (
            <ExamSection title="Upcoming" items={upcoming} />
          )}
          {completed.length > 0 && (
            <ExamSection title="Completed" items={completed} />
          )}
        </div>
      )}
    </>
  );
}
