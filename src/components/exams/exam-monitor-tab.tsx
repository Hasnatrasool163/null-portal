"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination, usePaged } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/misc";
import { EmptyState } from "@/components/ui/blocks";
import { AnnouncementsCard } from "@/components/exams/monitor/announcements-card";
import { ExtensionDialog } from "@/components/exams/monitor/extension-dialog";
import { IncidentLogDialog } from "@/components/exams/monitor/incident-log-dialog";
import { MonitorAttemptsTable } from "@/components/exams/monitor/monitor-attempts-table";
import { examsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { MonitorAttempt } from "@/shared/schemas/monitoring";

export function ExamMonitorTab({
  examId,
  readOnly,
}: {
  examId: string;
  readOnly: boolean;
}) {
  const [inspecting, setInspecting] = useState<MonitorAttempt | null>(null);
  const [extending, setExtending] = useState<MonitorAttempt | null>(null);

  const monitor = useQuery({
    queryKey: qk.exams.monitor(examId),
    queryFn: () => examsApi.monitor(examId),
    refetchInterval: 5_000,
  });

  const paged = usePaged(monitor.data?.attempts ?? [], 10);

  if (monitor.isPending) return <Skeleton className="h-56 w-full" />;
  if (monitor.isError) {
    return (
      <EmptyState
        title="Could not load live monitor"
        text={monitor.error.message}
        action={<Button onClick={() => monitor.refetch()}>Try again</Button>}
      />
    );
  }

  const data = monitor.data;
  const activeCount = data.attempts.filter(
    (a) => a.status === "IN_PROGRESS",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground inline-flex items-center gap-1.5">
          <Activity className="text-success h-3.5 w-3.5" />
          Live monitor refreshes every 5 seconds · {activeCount} active attempt
          {activeCount === 1 ? "" : "s"}
        </span>
        <span className="text-muted-foreground">
          Server time: {format(new Date(data.serverNow), "pp")}
        </span>
      </div>

      {data.attempts.length === 0 ? (
        <EmptyState
          title="No candidate attempts yet"
          text="Active and submitted attempts (excluding sandbox previews) will appear here in real time."
        />
      ) : (
        <MonitorAttemptsTable
          attempts={paged.slice}
          readOnly={readOnly}
          onInspect={setInspecting}
          onExtend={setExtending}
        />
      )}

      <Pagination
        page={paged.page}
        pageSize={paged.pageSize}
        total={paged.total}
        onPage={paged.setPage}
        noun="attempts"
      />

      <AnnouncementsCard
        examId={examId}
        announcements={data.announcements}
        readOnly={readOnly}
      />

      <IncidentLogDialog
        attempt={inspecting}
        onClose={() => setInspecting(null)}
      />

      <ExtensionDialog
        examId={examId}
        attempt={extending}
        onClose={() => setExtending(null)}
      />
    </div>
  );
}
