"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { ROLE_LABEL, type SessionUser } from "@/shared/schemas/auth";

/** Avatar card linking to /account (name + email; tooltip when collapsed). */
export function SidebarAccount({
  user,
  collapsed,
  onNavigate,
}: {
  user: SessionUser;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const active = usePathname() === "/account";
  return (
    <Tooltip
      content={
        <span className="block">
          {user.name}
          <span className="block opacity-60">{ROLE_LABEL[user.role]}</span>
        </span>
      }
      side="right"
      disabled={!collapsed}
    >
      <Link
        href="/account"
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? `Account: ${user.name}` : undefined}
        className={cn(
          "focus-visible:ring-ring flex h-12 items-center gap-2.5 rounded-md border px-[7px] whitespace-nowrap transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none",
          collapsed
            ? "hover:bg-muted border-transparent"
            : "bg-card hover:border-primary/40",
          active && "border-primary ring-primary/20 ring-2",
        )}
      >
        <span className="bg-foreground text-background flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
          {initials(user.name)}
        </span>
        <span
          className={cn(
            "min-w-0 leading-tight transition-opacity duration-150",
            collapsed ? "opacity-0" : "opacity-100 delay-75",
          )}
        >
          <span className="block truncate text-sm font-medium">
            {user.name}
          </span>
          <span className="text-muted-foreground block truncate text-xs">
            {user.email}
          </span>
        </span>
      </Link>
    </Tooltip>
  );
}
