"use client";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Lock,
  Play,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/tooltip";
import { formatDateTime, formatShortDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MyExamItem } from "@/shared/schemas/attempt";
import { ExamStatusChip } from "./exam-status-chip";

/** Footer context line: when it closes/opens, the score, or why it is locked. */
function footerFor(item: MyExamItem): { icon: LucideIcon; text: string } {
  switch (item.accessStatus) {
    case "CAN_START":
    case "IN_PROGRESS":
      return { icon: Clock, text: `Closes ${formatShortDateTime(item.endsAt)}` };
    case "UPCOMING":
      return {
        icon: Clock,
        text: item.accessReason || `Opens ${formatShortDateTime(item.startsAt)}`,
      };
    case "SUBMITTED":
      return {
        icon: CheckCircle2,
        text:
          item.resultsPublished && item.totalScore !== null
            ? `Score ${item.totalScore} / ${item.totalMarks}`
            : item.accessReason,
      };
    default:
      return { icon: Lock, text: item.accessReason };
  }
}

/** One assigned exam: status, schedule, instructions and its single action (start/resume/result). */
export function ExamCard({
  item,
  onStart,
  startingId,
}: {
  item: MyExamItem;
  onStart: (examId: string) => void;
  startingId: string | null;
}) {
  const isStarting = startingId === item.examId;
  const footer = footerFor(item);

  return (
    <Card interactive className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base leading-snug">{item.title}</CardTitle>
          <ExamStatusChip status={item.accessStatus} />
        </div>
        <p className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 text-xs">
          {item.questionCount} questions · {item.totalMarks} marks ·{" "}
          {item.durationMinutes} min
          {item.changedAt && (
            <Tooltip
              content={`Changed by the examiner on ${formatDateTime(item.changedAt)}. Details are in your notifications.`}
            >
              <span
                tabIndex={0}
                className="text-warning inline-flex items-center gap-1 font-medium focus-visible:underline focus-visible:outline-none"
              >
                · <RefreshCw className="h-3 w-3" aria-hidden="true" />
                Updated
              </span>
            </Tooltip>
          )}
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 text-sm">
        <dl className="text-muted-foreground grid grid-cols-[3.5rem_1fr] gap-y-0.5 text-xs">
          <dt>Opens</dt>
          <dd className="text-foreground/80 tabular-nums">
            {formatDateTime(item.startsAt)}
          </dd>
          <dt>Closes</dt>
          <dd className="text-foreground/80 tabular-nums">
            {formatDateTime(item.endsAt)}
          </dd>
        </dl>

        {item.instructions && (
          <p className="text-muted-foreground line-clamp-2 text-xs">
            {item.instructions}
          </p>
        )}

        {/* Footer: context on the left, the one action on the right. */}
        <div className="mt-auto flex min-h-9 items-center justify-between gap-3 border-t pt-3">
          <span className="text-muted-foreground inline-flex min-w-0 items-center gap-1.5 text-xs">
            <footer.icon
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                item.accessStatus === "SUBMITTED" && "text-success",
              )}
              aria-hidden="true"
            />
            <span className="truncate">{footer.text}</span>
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
