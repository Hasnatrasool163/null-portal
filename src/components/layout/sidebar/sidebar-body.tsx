"use client";
import type { SessionUser } from "@/shared/schemas/auth";
import { SidebarFooter } from "./sidebar-footer";
import { SidebarNav } from "./sidebar-nav";

/** Sidebar contents shared by the desktop aside and the mobile drawer. */
export function SidebarBody({
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
  return (
    <>
      <SidebarNav
        role={user.role}
        collapsed={collapsed}
        onNavigate={onNavigate}
      />
      <SidebarFooter
        user={user}
        collapsed={collapsed}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
    </>
  );
}
