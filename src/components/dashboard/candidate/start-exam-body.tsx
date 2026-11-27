"use client";
import { Clock, Info, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/tooltip";
import {
  SystemCheckCompact,
  useSystemChecks,
} from "@/components/attempt/system-check";
import { formatShortDateTime } from "@/lib/format";
import type { MyExamItem } from "@/shared/schemas/attempt";

/** Pre-start sheet: exam summary, instructions, device checks and acknowledgment. Keyed per exam. */
export function StartExamBody({
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
          Window closes {formatShortDateTime(exam.endsAt)}
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
