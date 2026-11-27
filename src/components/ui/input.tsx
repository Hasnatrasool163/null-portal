import * as React from "react";
import { cn } from "@/lib/utils";

// Filled field: soft fill at rest, border + glow only on focus/error.
export const fieldClass =
  "w-full rounded-md border border-transparent bg-muted/70 px-3 py-2 text-sm transition-[background-color,border-color,box-shadow] duration-150 placeholder:text-muted-foreground/80 hover:bg-muted focus-visible:border-primary/50 focus-visible:bg-card focus-visible:ring-[3px] focus-visible:ring-primary/15 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive/60 aria-[invalid=true]:bg-destructive/5";
const field = fieldClass;

// forwardRef so react-hook-form's register() works directly.
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(field, "h-10", className)} {...p} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(field, "min-h-24", className)} {...p} />
));
Textarea.displayName = "Textarea";

export const Label = ({
  className,
  ...p
}: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn("text-sm font-medium", className)} {...p} />
);
