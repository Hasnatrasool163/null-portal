import {
  CalendarClock,
  CheckCircle2,
  FilePen,
  Radio,
  type LucideIcon,
} from "lucide-react";
import { formatDistanceStrict, plural } from "@/lib/format";
import type { ExaminerOverview, Phase } from "@/shared/schemas/exam";

/** One KPI card per exam phase, in display order. */
export const PHASE_STATS: {
  phase: Phase;
  label: string;
  icon: LucideIcon;
  tone: string;
  accent: string;
}[] = [
  {
    phase: "ONGOING",
    label: "Live now",
    icon: Radio,
    tone: "bg-success/12 text-success",
    accent: "bg-success",
  },
  {
    phase: "UPCOMING",
    label: "Upcoming",
    icon: CalendarClock,
    tone: "bg-warning/12 text-warning",
    accent: "bg-warning",
  },
  {
    phase: "DRAFT",
    label: "Drafts",
    icon: FilePen,
    tone: "bg-accent text-accent-foreground",
    accent: "bg-primary",
  },
  {
    phase: "COMPLETED",
    label: "Completed",
    icon: CheckCircle2,
    tone: "bg-muted text-muted-foreground",
    accent: "bg-muted-foreground/40",
  },
];

/** The one line of context under each phase count. */
export function phaseContext(
  phases: Record<Phase, number>,
  { actions, live, upcoming }: ExaminerOverview,
): Record<Phase, string> {
  const sitting = live.reduce((n, e) => n + e.active, 0);
  const draftsNeedingSetup = actions.filter(
    (x) => x.kind === "draft" && x.cta === "Continue",
  ).length;
  const toPublish = actions.filter((x) => x.kind === "publish").length;
  const toGrade = actions.filter((x) => x.kind === "grade").length;

  return {
    ONGOING: phases.ONGOING
      ? `${plural(sitting, "candidate")} sitting now`
      : "Nothing running",
    UPCOMING: upcoming[0]
      ? `Next opens in ${formatDistanceStrict(upcoming[0].startsAt)}`
      : "Nothing scheduled",
    DRAFT: phases.DRAFT
      ? draftsNeedingSetup
        ? `${draftsNeedingSetup} need setup`
        : "All ready to publish"
      : "No drafts",
    COMPLETED:
      toGrade || toPublish
        ? [
            toGrade && `${toGrade} to grade`,
            toPublish && `${toPublish} to publish`,
          ]
            .filter(Boolean)
            .join(" · ")
        : "All results out",
  };
}
