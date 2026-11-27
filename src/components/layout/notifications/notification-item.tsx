"use client";
import * as DM from "@radix-ui/react-dropdown-menu";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NotificationItem as Notification } from "@/shared/schemas/notification";
import { NOTIFICATION_ICON } from "./notification-icons";

/** One row in the bell dropdown; unread rows are tinted and carry a dot. */
export function NotificationItem({
  notification: n,
  onSelect,
}: {
  notification: Notification;
  onSelect: () => void;
}) {
  const { icon: Icon, tone } = NOTIFICATION_ICON[n.type];
  return (
    <DM.Item
      onSelect={onSelect}
      className={cn(
        "hover:bg-muted focus:bg-muted flex cursor-pointer gap-3 rounded-md px-3 py-2.5 outline-none",
        !n.read && "bg-primary/5",
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone)} aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className={cn("text-sm leading-snug", !n.read && "font-medium")}>
          {n.title}
        </p>
        {n.body && (
          <p className="text-muted-foreground text-xs leading-snug">{n.body}</p>
        )}
        <p className="text-muted-foreground text-[11px]">
          {formatRelative(n.createdAt)}
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
}
