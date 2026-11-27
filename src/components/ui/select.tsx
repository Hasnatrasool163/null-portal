import * as React from "react";
import { cn } from "@/lib/utils";

// Native <select>: accessible, works with react-hook-form's register() out of the box.
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...p }, ref) => (
  <select
    ref={ref}
    className={cn(
      "border-input bg-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50",
      className,
    )}
    {...p}
  />
));
Select.displayName = "Select";
