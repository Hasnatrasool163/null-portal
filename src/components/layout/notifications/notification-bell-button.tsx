"use client";
import { Bell } from "lucide-react";

/**
 * Bell icon button with an unread count badge. Spreads remaining props (and `ref`,
 * a plain prop in React 19) so it can be a Radix `asChild` trigger.
 */
export function NotificationBellButton({
  unread,
  ...props
}: React.ComponentProps<"button"> & { unread: number }) {
  return (
    <button
      type="button"
      aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
      className="hover:bg-muted focus-visible:ring-ring data-[state=open]:bg-muted relative flex h-10 w-10 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
      {...props}
    >
      <Bell className="h-5 w-5" aria-hidden="true" />
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="bg-destructive absolute top-1 right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold text-white"
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}
