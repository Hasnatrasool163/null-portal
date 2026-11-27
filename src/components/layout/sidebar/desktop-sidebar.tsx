"use client";
import { ChevronLeft } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { ConsoleBrand } from "@/components/layout/console-brand";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/shared/schemas/auth";
import { SidebarBody } from "./sidebar-body";

/** Fixed, collapsible left sidebar (lg and up). */
export function DesktopSidebar({
  user,
  collapsed,
  onToggleCollapsed,
  onLogout,
}: {
  user: SessionUser;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onLogout: () => void;
}) {
  return (
    <aside
      className={cn(
        "bg-sidebar fixed inset-y-0 left-0 z-30 hidden flex-col border-r transition-[width] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] lg:flex",
        collapsed ? "w-[72px]" : "w-60",
      )}
    >
      <div className="flex h-16 shrink-0 items-center overflow-hidden border-b pl-5">
        <ConsoleBrand role={user.role} collapsed={collapsed} />
      </div>

      {/* Edge toggle: same spot in both states, so nothing jumps. */}
      <Tooltip
        content={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        side="right"
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className="bg-card text-muted-foreground hover:text-foreground hover:border-primary/50 shadow-elev-1 focus-visible:ring-ring absolute top-5 -right-3 z-10 flex h-6 w-6 items-center justify-center rounded-full border transition-[color,border-color,transform] duration-150 focus-visible:ring-2 focus-visible:outline-none motion-safe:active:scale-90"
        >
          <ChevronLeft
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-300",
              collapsed && "rotate-180",
            )}
          />
        </button>
      </Tooltip>

      <SidebarBody user={user} collapsed={collapsed} onLogout={onLogout} />
    </aside>
  );
}
