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
      <D.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-40 bg-black/50" />
      <D.Content
        className={cn(
          "bg-card fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border p-6 shadow-lg focus:outline-none",
          className,
        )}
      >
        <D.Title className="text-lg font-semibold">{title}</D.Title>
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
          className="focus-visible:ring-ring absolute top-4 right-4 rounded-sm opacity-70 hover:opacity-100 focus-visible:ring-2"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </D.Close>
      </D.Content>
    </D.Portal>
  );
}
