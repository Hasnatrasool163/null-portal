"use client";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <D.Portal>
      <D.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fixed inset-0 z-40 bg-black/40" />
      <D.Content
        className={cn(
          "bg-card shadow-elev-3 fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border p-6 focus:outline-none",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-2",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className,
        )}
      >
        <D.Title className="pr-8 text-lg font-semibold tracking-tight">
          {title}
        </D.Title>
        <D.Description
          className={cn(
            "text-muted-foreground mt-1 text-sm",
            !description && "sr-only",
          )}
        >
          {description ?? title}
        </D.Description>
        <div className="mt-4">{children}</div>
        <D.Close
          className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring absolute top-4 right-4 rounded-lg p-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </D.Close>
      </D.Content>
    </D.Portal>
  );
}
