"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip } from "@/components/ui/tooltip";
import { NAV } from "@/components/layout/nav-config";
import { cn } from "@/lib/utils";
import type { Role } from "@/shared/schemas/auth";
import {
  SidebarLabel,
  rowActiveClass,
  rowClass,
  rowIconClass,
  rowMutedClass,
} from "./sidebar-row";

/** The role's main navigation links; the current section is highlighted. */
export function SidebarNav({
  role,
  collapsed,
  onNavigate,
}: {
  role: Role;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav
      className="flex-1 overflow-x-hidden overflow-y-auto px-3 py-3"
      aria-label="Main"
    >
      <ul className="space-y-1">
        {NAV[role].map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Tooltip content={label} side="right" disabled={!collapsed}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  aria-label={collapsed ? label : undefined}
                  className={cn(
                    rowClass,
                    active ? rowActiveClass : rowMutedClass,
                  )}
                >
                  <Icon className={rowIconClass} aria-hidden="true" />
                  <SidebarLabel collapsed={collapsed}>{label}</SidebarLabel>
                </Link>
              </Tooltip>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
