import { PHASE_LABEL, type Phase } from "@/shared/schemas/exam";

const PHASE_DOT: Record<Phase, string> = {
  ONGOING: "bg-success",
  UPCOMING: "bg-warning",
  DRAFT: "bg-muted-foreground/50",
  COMPLETED: "bg-primary/60",
};

/** Phase as a status dot + label (live exams pulse). Used in the list and the exam header. */
export function PhaseStatus({
  phase,
  className,
}: {
  phase: Phase;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-sm whitespace-nowrap ${className ?? ""}`}
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        {phase === "ONGOING" && (
          <span className="bg-success absolute inline-flex h-full w-full animate-ping rounded-full opacity-50" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${PHASE_DOT[phase]}`}
        />
      </span>
      {PHASE_LABEL[phase]}
    </span>
  );
}
