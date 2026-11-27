import { cn } from "@/lib/utils";

/*
 * Layout rule that makes collapse jerk-free: every row is 48px wide when
 * collapsed and the icon sits at a FIXED 15px inset (15 + 18 + 15 = 48), so
 * icons never move. Labels stay mounted and only fade; the aside clips them.
 */
export const rowClass =
  "group/row flex h-10 w-full items-center gap-3 rounded-md px-[15px] text-sm font-medium whitespace-nowrap transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";
export const rowIconClass = "h-[18px] w-[18px] shrink-0";
export const rowMutedClass =
  "text-muted-foreground hover:bg-muted hover:text-foreground";
export const rowActiveClass =
  "bg-primary text-primary-foreground shadow-elev-1";

/** Row label that fades out (but stays mounted) when the sidebar collapses. */
export function SidebarLabel({
  collapsed,
  children,
}: {
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "truncate transition-opacity duration-150",
        collapsed ? "pointer-events-none opacity-0" : "opacity-100 delay-75",
      )}
    >
      {children}
    </span>
  );
}
