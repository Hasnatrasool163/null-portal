import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * One card style everywhere: same radius, border and elevation.
 * `interactive` adds the shared hover lift for clickable cards.
 */
export const Card = ({
  className,
  interactive,
  ...p
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) => (
  <div
    className={cn(
      "bg-card text-card-foreground shadow-elev-1 rounded-lg border",
      interactive &&
        "hover:border-foreground/15 hover:shadow-elev-2 transition-[transform,box-shadow,border-color] duration-200 motion-safe:hover:-translate-y-0.5",
      className,
    )}
    {...p}
  />
);
export const CardHeader = ({
  className,
  ...p
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1.5 p-5 sm:p-6", className)} {...p} />
);
export const CardTitle = ({
  className,
  ...p
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    className={cn(
      "text-base leading-snug font-semibold tracking-tight",
      className,
    )}
    {...p}
  />
);
export const CardDescription = ({
  className,
  ...p
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-muted-foreground text-sm", className)} {...p} />
);
export const CardContent = ({
  className,
  ...p
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-5 pt-0 sm:p-6 sm:pt-0", className)} {...p} />
);
