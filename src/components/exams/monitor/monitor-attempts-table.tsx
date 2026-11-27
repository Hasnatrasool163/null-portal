"use client";
import { AlertCircle, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatMinutesSeconds } from "@/lib/format";
import type { MonitorAttempt } from "@/shared/schemas/monitoring";

/** Live attempts: progress, time left, connection health and per-row actions. */
export function MonitorAttemptsTable({
  attempts,
  readOnly,
  onInspect,
  onExtend,
}: {
  attempts: MonitorAttempt[];
  readOnly: boolean;
  onInspect: (attempt: MonitorAttempt) => void;
  onExtend: (attempt: MonitorAttempt) => void;
}) {
  return (
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
        {attempts.map((a) => (
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
                ? formatMinutesSeconds(a.remainingSeconds)
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
              <Button size="sm" variant="ghost" onClick={() => onInspect(a)}>
                <AlertCircle className="h-3.5 w-3.5" />
                {a.incidentCount}
              </Button>
            </TD>
            <TD className="text-right">
              {!readOnly && a.status === "IN_PROGRESS" && (
                <Button size="sm" variant="outline" onClick={() => onExtend(a)}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  Extend
                </Button>
              )}
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
