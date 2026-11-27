"use client";
import { useRouter } from "next/navigation";
import * as DM from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
import { NotificationBellButton } from "@/components/layout/notifications/notification-bell-button";
import { NotificationItem } from "@/components/layout/notifications/notification-item";
import { useClearedNotifications } from "@/components/layout/notifications/use-cleared-notifications";
import { useNotifications } from "@/components/layout/notifications/use-notifications";

/** The dropdown shows only the most recent few; the server returns newest first. */
const MAX_VISIBLE = 5;

/**
 * Bell + unread badge + dropdown of recent notifications, shown in the dashboard header.
 * "Clear" marks everything read on the server and hides what is there now (per browser;
 * see useClearedNotifications). Pass `userId` to scope the clear to one account.
 */
export function NotificationBell({ userId }: { userId?: string }) {
  const router = useRouter();
  const { query, markRead } = useNotifications();
  const { clear, isCleared } = useClearedNotifications(userId);

  const items = query.data?.items ?? [];
  const remaining = items.filter((n) => !isCleared(n.createdAt));
  const visible = remaining.slice(0, MAX_VISIBLE);
  // Server count, minus unread items the user has cleared (until the refetch catches up).
  const hiddenUnread = items.filter(
    (n) => !n.read && isCleared(n.createdAt),
  ).length;
  const unread = Math.max(0, (query.data?.unread ?? 0) - hiddenUnread);

  function clearAll() {
    // Watermark at the newest item too, in case its timestamp is ahead of this clock.
    const newest = items[0]?.createdAt;
    const now = new Date().toISOString();
    clear(newest && Date.parse(newest) > Date.parse(now) ? newest : now);
    markRead.mutate(undefined);
  }

  return (
    <DM.Root modal={false}>
      <DM.Trigger asChild>
        <NotificationBellButton unread={unread} />
      </DM.Trigger>
      <DM.Portal>
        <DM.Content
          side="bottom"
          align="end"
          sideOffset={8}
          collisionPadding={8}
          className={cn(
            "bg-card shadow-elev-3 z-[60] flex max-h-[min(70vh,520px)] w-[min(92vw,380px)] flex-col rounded-lg border",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => markRead.mutate(undefined)}
                  className="text-primary text-xs font-medium hover:underline"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={clearAll}
                disabled={visible.length === 0}
                className="text-muted-foreground hover:text-foreground text-xs font-medium hover:underline disabled:pointer-events-none disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="overflow-y-auto p-1">
            {query.isPending ? (
              <p className="text-muted-foreground px-3 py-6 text-center text-sm">
                Loading…
              </p>
            ) : visible.length === 0 ? (
              <p className="text-muted-foreground px-3 py-8 text-center text-sm">
                {items.length > 0 ? "No notifications" : "You're all caught up."}
              </p>
            ) : (
              visible.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onSelect={() => {
                    if (!n.read) markRead.mutate([n.id]);
                    if (n.link) router.push(n.link);
                  }}
                />
              ))
            )}
          </div>
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}
