import type { LucideIcon } from "lucide-react";
import { fieldClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Text input with a leading icon and an optional trailing control (e.g. show-password). */
export function IconInput({
  icon: Icon,
  invalid,
  trailing,
  className,
  ...props
}: React.ComponentProps<"input"> & {
  icon: LucideIcon;
  invalid?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="group relative">
      <Icon
        className="text-muted-foreground group-focus-within:text-primary pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors"
        aria-hidden="true"
      />
      <input
        {...props}
        aria-invalid={invalid}
        className={cn(
          fieldClass,
          "h-10 pl-9",
          trailing ? "pr-10" : "pr-3",
          className,
        )}
      />
      {trailing && (
        <div className="absolute top-1/2 right-1 -translate-y-1/2">
          {trailing}
        </div>
      )}
    </div>
  );
}
