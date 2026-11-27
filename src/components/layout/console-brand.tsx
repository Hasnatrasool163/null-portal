import Link from "next/link";
import { BrandLogo } from "@/components/layout/brand-logo";
import { CONSOLE } from "@/components/layout/nav-config";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import type { Role } from "@/shared/schemas/auth";

/** Logo + product name + role console label; links home. Text fades when the sidebar collapses. */
export function ConsoleBrand({
  role,
  collapsed = false,
}: {
  role: Role;
  collapsed?: boolean;
}) {
  return (
    <Link
      href="/dashboard"
      className="flex min-w-0 items-center gap-2.5"
      aria-label={`${BRAND.name} home`}
    >
      <BrandLogo className="h-8 w-8 shrink-0" />
      <span
        className={cn(
          "min-w-0 leading-tight whitespace-nowrap transition-opacity duration-150",
          collapsed ? "opacity-0" : "opacity-100 delay-75",
        )}
      >
        <span className="block truncate text-sm font-semibold tracking-tight">
          {BRAND.name}
        </span>
        <span className="text-muted-foreground block truncate text-[10px] font-medium">
          {CONSOLE[role]}
        </span>
      </span>
    </Link>
  );
}
