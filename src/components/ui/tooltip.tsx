"use client";
import * as T from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

export const TooltipProvider = T.Provider;

/**
 * App tooltip: ink-on-paper chip with an arrow, short fade/zoom, keyboard-accessible.
 * `disabled` keeps the same element tree (no remount) but never opens.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  disabled,
  className,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <T.Root open={disabled ? false : undefined}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={8}
          className={cn(
            "bg-foreground text-background shadow-elev-3 z-[70] max-w-64 rounded-md px-2.5 py-1.5 text-xs leading-snug font-medium select-none",
            "data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95",
            "data-[state=instant-open]:animate-in data-[state=instant-open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "data-[side=right]:slide-in-from-left-1 data-[side=left]:slide-in-from-right-1 data-[side=top]:slide-in-from-bottom-1 data-[side=bottom]:slide-in-from-top-1",
            className,
          )}
        >
          {content}
          <T.Arrow className="fill-foreground" width={10} height={5} />
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
