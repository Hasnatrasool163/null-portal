import { cn } from "@/lib/utils";
import type { MyExamItem } from "@/shared/schemas/attempt";

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
export function ExamStatusChip({
  status,
}: {
  status: MyExamItem["accessStatus"];
}) {
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
