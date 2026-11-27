import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Spinner = ({ className }: { className?: string }) => (
  <Loader2 className={cn("h-4 w-4 animate-spin", className)} />
);

export const Skeleton = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "from-muted via-muted/40 to-muted animate-pulse rounded-lg bg-gradient-to-r",
      className,
    )}
  />
);

export const Badge = ({
  className,
  ...p
}: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      "bg-accent text-accent-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
      className,
    )}
    {...p}
  />
);

/** Small keyboard hint, e.g. <Kbd>/</Kbd>. */
export const Kbd = ({
  className,
  ...p
}: React.HTMLAttributes<HTMLElement>) => (
  <kbd
    className={cn(
      "bg-muted text-muted-foreground inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 font-mono text-[11px]",
      className,
    )}
    {...p}
  />
);
