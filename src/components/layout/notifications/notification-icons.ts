import {
  AlarmClock,
  Award,
  CalendarClock,
  CalendarPlus,
  ClipboardCheck,
  Clock,
  FileBadge,
  KeyRound,
  Megaphone,
  Scale,
  Timer,
  TrendingUp,
  UserCog,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { NotificationType } from "@/shared/schemas/notification";

/** Icon and colour per notification type. */
export const NOTIFICATION_ICON: Record<
  NotificationType,
  { icon: LucideIcon; tone: string }
> = {
  EXAM_PUBLISHED: { icon: CalendarPlus, tone: "text-primary" },
  EXAM_ENROLLED: { icon: CalendarPlus, tone: "text-primary" },
  EXAM_CLOSING_SOON: { icon: Clock, tone: "text-warning" },
  RESULTS_PUBLISHED: { icon: Award, tone: "text-success" },
  EXAM_CANCELLED: { icon: XCircle, tone: "text-destructive" },
  GRADING_PENDING: { icon: ClipboardCheck, tone: "text-warning" },
  DISPUTE_FILED: { icon: Scale, tone: "text-warning" },
  DISPUTE_UPDATED: { icon: Scale, tone: "text-primary" },
  DISPUTE_ESCALATED: { icon: Scale, tone: "text-destructive" },
  DISPUTE_REMINDER: { icon: AlarmClock, tone: "text-warning" },
  DISPUTE_OVERDUE: { icon: AlarmClock, tone: "text-destructive" },
  DISPUTE_DEADLINE: { icon: AlarmClock, tone: "text-warning" },
  DISPUTE_FINAL: { icon: Scale, tone: "text-success" },
  DISPUTE_PATTERN: { icon: Scale, tone: "text-destructive" },
  SCORE_CHANGED: { icon: TrendingUp, tone: "text-primary" },
  CERTIFICATE_SUPERSEDED: { icon: FileBadge, tone: "text-warning" },
  EXAM_UPDATED: { icon: CalendarClock, tone: "text-warning" },
  TIME_EXTENDED: { icon: Timer, tone: "text-success" },
  ANNOUNCEMENT: { icon: Megaphone, tone: "text-primary" },
  PASSWORD_RESET: { icon: KeyRound, tone: "text-destructive" },
  EXAM_REASSIGNED: { icon: UserCog, tone: "text-primary" },
};
