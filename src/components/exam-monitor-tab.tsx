"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Activity,
  AlertCircle,
  Clock,
  Megaphone,
  PlusCircle,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Skeleton, Spinner } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/blocks";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api-client";
import {
  INCIDENT_LABEL,
  type MonitorAttempt,
  type MonitorResponse,
} from "@/shared/schemas/monitoring";

function fmtSeconds(s: number) {
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

export function ExamMonitorTab({
  examId,
  readOnly,
}: {
  examId: string;
  readOnly: boolean;
}) {
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const [inspecting, setInspecting] = useState<MonitorAttempt | null>(null);
  const [extending, setExtending] = useState<MonitorAttempt | null>(null);
  const [extMinutes, setExtMinutes] = useState("5");
  const [extReason, setExtReason] = useState("");

  const monitor = useQuery({
    queryKey: ["exam-monitor", examId],
    queryFn: () => api<MonitorResponse>(`/api/exams/${examId}/monitor`),
    refetchInterval: 5_000,
  });

  const postAnn = useMutation({
    mutationFn: (msg: string) =>
      api(`/api/exams/${examId}/announcements`, {
        method: "POST",
        body: { message: msg },
      }),
    onSuccess: () => {
      toast.success("Announcement broadcast to active candidates");
      setMessage("");
      qc.invalidateQueries({ queryKey: ["exam-monitor", examId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const grantExt = useMutation({
    mutationFn: () =>
      api(`/api/attempts/${extending!.attemptId}/extensions`, {
        method: "POST",
        body: { minutes: Number(extMinutes), reason: extReason.trim() },
      }),
    onSuccess: () => {
      toast.success("Time extension granted and logged");
      setExtending(null);
      setExtMinutes("5");
      setExtReason("");
      qc.invalidateQueries({ queryKey: ["exam-monitor", examId] });
    },
    onError: (e) => toast.error(e.message),
  });

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

      {/* Live attempts table */}
      {data.attempts.length === 0 ? (
        <EmptyState
          title="No candidate attempts yet"
          text="Active and submitted attempts (excluding sandbox previews) will appear here in real time."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Candidate</TH>
              <TH>Status</TH>
              <TH>Progress</TH>
              <TH>Time left</TH>
              <TH>Last seen / Connection</TH>
              <TH>Indicators</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {data.attempts.map((a) => (
              <TR key={a.attemptId}>
                <TD>
                  <p className="font-medium">{a.candidateName}</p>
                  <p className="text-muted-foreground text-xs">
                    {a.candidateEmail}
                  </p>
                </TD>
                <TD>
                  <Badge
                    className={
                      a.status === "IN_PROGRESS"
                        ? "bg-success/15 text-success"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {a.status === "IN_PROGRESS" ? "Active" : "Submitted"}
                  </Badge>
                </TD>
                <TD>
                  {a.answeredCount} / {a.totalQuestions}
                </TD>
                <TD className="font-mono text-xs">
                  {a.status === "IN_PROGRESS"
                    ? fmtSeconds(a.remainingSeconds)
                    : "—"}
                  {a.extensions.length > 0 && (
                    <span className="text-muted-foreground ml-1 font-sans">
                      (+
                      {a.extensions.reduce((s, e) => s + e.minutes, 0)}m)
                    </span>
                  )}
                </TD>
                <TD className="text-xs">
                  <div
                    className={
                      a.status === "IN_PROGRESS" && a.lastSeenAgeSeconds > 30
                        ? "text-warning font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    {a.lastSeenAgeSeconds}s ago
                  </div>
                  {(a.disconnectCount > 0 || a.lateSyncCount > 0) && (
                    <div className="text-muted-foreground">
                      {a.disconnectCount} disconnect(s)
                      {a.totalOfflineSeconds > 0 &&
                        ` · ${a.totalOfflineSeconds}s offline`}
                      {a.lateSyncCount > 0 && ` · ${a.lateSyncCount} late sync`}
                    </div>
                  )}
                </TD>
                <TD>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setInspecting(a)}
                  >
                    <AlertCircle className="h-3.5 w-3.5" />
                    {a.incidentCount}
                  </Button>
                </TD>
                <TD className="text-right">
                  {!readOnly && a.status === "IN_PROGRESS" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setExtending(a)}
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Extend
                    </Button>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {/* Announcements card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="h-4 w-4" />
            Exam announcements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!readOnly && (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (message.trim()) postAnn.mutate(message.trim());
              }}
            >
              <Input
                placeholder="Broadcast a clarification or update to active candidates..."
                aria-label="Announcement message"
                maxLength={1000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <Button
                type="submit"
                disabled={!message.trim() || postAnn.isPending}
              >
                {postAnn.isPending ? (
                  <Spinner />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send
              </Button>
            </form>
          )}

          {data.announcements.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No announcements sent for this exam yet.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {data.announcements.map((ann) => (
                <li key={ann.id} className="p-3 text-sm">
                  <p>{ann.message}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {ann.authorName} · {format(new Date(ann.createdAt), "PP p")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Advisory Incident Log Dialog */}
      <Dialog
        open={inspecting !== null}
        onOpenChange={(o) => !o && setInspecting(null)}
      >
        <DialogContent
          className="max-h-[85vh] max-w-2xl overflow-y-auto"
          title={
            inspecting
              ? `Activity log — ${inspecting.candidateName}`
              : "Activity log"
          }
          description="Advisory indicators only — not proof of misconduct. Never auto-penalized."
        >
          {inspecting && (
            <div className="space-y-4 text-sm">
              <p className="bg-muted text-muted-foreground rounded-md p-3 text-xs">
                Events below are browser-reported signals (e.g. tab switch,
                network drop). They are advisory indicators, not proof of
                misconduct, and never deduct marks automatically.
              </p>

              {inspecting.extensions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-1.5 font-medium">
                    <Clock className="h-4 w-4" />
                    Granted time extensions
                  </h3>
                  <ul className="divide-y rounded-md border text-xs">
                    {inspecting.extensions.map((ex) => (
                      <li key={ex.id} className="p-2.5">
                        <b>+{ex.minutes} min</b> — {ex.reason}{" "}
                        <span className="text-muted-foreground">
                          ({ex.grantedByName},{" "}
                          {format(new Date(ex.createdAt), "PP p")})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {inspecting.incidents.length === 0 ? (
                <p className="text-muted-foreground">
                  No advisory events recorded for this attempt.
                </p>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Event</TH>
                      <TH>Server time</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {inspecting.incidents.map((inc) => (
                      <TR key={inc.id}>
                        <TD>
                          <Badge>{INCIDENT_LABEL[inc.type]}</Badge>
                        </TD>
                        <TD className="text-muted-foreground text-xs">
                          {format(new Date(inc.occurredAt), "PP pp")}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setInspecting(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Grant Time Extension Dialog */}
      <Dialog
        open={extending !== null}
        onOpenChange={(o) => !o && setExtending(null)}
      >
        <DialogContent
          title={
            extending
              ? `Grant time extension — ${extending.candidateName}`
              : "Grant time extension"
          }
          description="Audited fairness valve for verified power or hardware disruptions. Recorded in exam reports."
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="ext-min" className="text-sm font-medium">
                Extra minutes (1–120)
              </label>
              <Input
                id="ext-min"
                type="number"
                min={1}
                max={120}
                value={extMinutes}
                onChange={(e) => setExtMinutes(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ext-reason" className="text-sm font-medium">
                Required audit reason
              </label>
              <Input
                id="ext-reason"
                placeholder="e.g. Verified lab workstation reboot during exam"
                value={extReason}
                onChange={(e) => setExtReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setExtending(null)}>
                Cancel
              </Button>
              <Button
                disabled={
                  extReason.trim().length < 3 ||
                  Number(extMinutes) < 1 ||
                  grantExt.isPending
                }
                onClick={() => grantExt.mutate()}
              >
                {grantExt.isPending && <Spinner />}
                Grant +{extMinutes} min
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
