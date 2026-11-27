"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/shared/schemas/auth";
import { SidebarAccount } from "./sidebar-account";
import {
  SidebarLabel,
  rowActiveClass,
  rowClass,
  rowIconClass,
  rowMutedClass,
} from "./sidebar-row";

/** Bottom of the sidebar: settings, account card and log out. */
export function SidebarFooter({
  user,
  collapsed,
  onNavigate,
  onLogout,
}: {
  user: SessionUser;
  collapsed: boolean;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  const settingsActive = usePathname() === "/settings";
  return (
    <div className="space-y-1 overflow-x-hidden border-t px-3 py-3">
      <Tooltip content="Settings" side="right" disabled={!collapsed}>
        <Link
          href="/settings"
          onClick={onNavigate}
          aria-current={settingsActive ? "page" : undefined}
          aria-label={collapsed ? "Settings" : undefined}
          className={cn(
            rowClass,
            settingsActive ? rowActiveClass : rowMutedClass,
          )}
        >
          <Settings className={rowIconClass} aria-hidden="true" />
          <SidebarLabel collapsed={collapsed}>Settings</SidebarLabel>
        </Link>
      </Tooltip>

      <SidebarAccount
        user={user}
        collapsed={collapsed}
        onNavigate={onNavigate}
      />

      <Tooltip content="Log out" side="right" disabled={!collapsed}>
        <button
          type="button"
          onClick={onLogout}
          aria-label={collapsed ? "Log out" : undefined}
          className={cn(
            rowClass,
            "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
          )}
        >
          <LogOut className={rowIconClass} aria-hidden="true" />
          <SidebarLabel collapsed={collapsed}>Log out</SidebarLabel>
        </button>
      </Tooltip>
    </div>
  );
}
