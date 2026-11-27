"use client";
import { useRouter } from "next/navigation";
import * as DM from "@radix-ui/react-dropdown-menu";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Award,
  AlarmClock,
  CalendarClock,
  FileBadge,
  KeyRound,
  Megaphone,
  Timer,
  TrendingUp,
  UserCog,
  CalendarPlus,
  ClipboardCheck,
  Scale,
  Clock,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type {
  NotificationList,
  NotificationType,
} from "@/shared/schemas/notification";

const ICON: Record<NotificationType, { icon: LucideIcon; tone: string }> = {
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

const KEY = ["notifications"];

/**
 * Bell + unread badge + dropdown list. Polls every minute (reminders such as "closing soon"
 * are generated server-side on each read). `trigger` renders the button so the sidebar row
 * and the mobile header icon can share one component.
 */
export function NotificationBell({
  trigger,
  side = "bottom",
}: {
  trigger: (unread: number) => React.ReactNode;
  side?: "bottom" | "right";
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: KEY,
    queryFn: () => api<NotificationList>("/api/notifications"),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const markRead = useMutation({
    mutationFn: (ids?: string[]) =>
      api("/api/notifications/read", { method: "POST", body: { ids } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const unread = q.data?.unread ?? 0;
  const items = q.data?.items ?? [];

  return (
    <DM.Root modal={false}>
      <DM.Trigger asChild>{trigger(unread)}</DM.Trigger>
      <DM.Portal>
        <DM.Content
          side={side}
          align="end"
          sideOffset={8}
          collisionPadding={8}
          className={cn(
            "bg-card shadow-elev-3 z-[60] flex max-h-[min(70vh,520px)] w-[min(92vw,380px)] flex-col rounded-lg border",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          )}
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markRead.mutate(undefined)}
                className="text-primary text-xs font-medium hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto p-1">
            {q.isPending ? (
              <p className="text-muted-foreground px-3 py-6 text-center text-sm">
                Loading…
              </p>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground px-3 py-8 text-center text-sm">
                You&apos;re all caught up.
              </p>
            ) : (
              items.map((n) => {
                const { icon: Icon, tone } = ICON[n.type];
                return (
                  <DM.Item
                    key={n.id}
                    onSelect={() => {
                      if (!n.read) markRead.mutate([n.id]);
                      if (n.link) router.push(n.link);
                    }}
                    className={cn(
                      "hover:bg-muted focus:bg-muted flex cursor-pointer gap-3 rounded-md px-3 py-2.5 outline-none",
                      !n.read && "bg-primary/5",
                    )}
                  >
                    <Icon
                      className={cn("mt-0.5 h-4 w-4 shrink-0", tone)}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p
                        className={cn(
                          "text-sm leading-snug",
                          !n.read && "font-medium",
                        )}
                      >
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-muted-foreground text-xs leading-snug">
                          {n.body}
                        </p>
                      )}
                      <p className="text-muted-foreground text-[11px]">
                        {formatDistanceToNow(new Date(n.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {!n.read && (
                      <span
                        className="bg-primary mt-1.5 h-2 w-2 shrink-0 rounded-full"
                        aria-label="Unread"
                      />
                    )}
                  </DM.Item>
                );
              })
            )}
          </div>
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}

export function UnreadBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (count === 0) return null;
  return (
    <span
      className={cn(
        "bg-destructive text-white flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold",
        className,
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
