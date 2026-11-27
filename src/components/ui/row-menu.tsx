"use client";
import * as DM from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "./tooltip";

export type RowMenuItem =
  | {
      label: string;
      icon?: LucideIcon;
      onSelect: () => void;
      destructive?: boolean;
      disabled?: boolean;
      hint?: string;
    }
  | "separator";

/** "⋯" overflow menu for table rows: keeps secondary actions out of the way. */
export function RowMenu({ label, items }: { label: string; items: RowMenuItem[] }) {
  return (
    <DM.Root modal={false}>
      <Tooltip content="More actions">
        <DM.Trigger
          aria-label={label}
          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring data-[state=open]:bg-muted data-[state=open]:text-foreground inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <MoreHorizontal className="h-4 w-4" />
        </DM.Trigger>
      </Tooltip>
      <DM.Portal>
        <DM.Content
          align="end"
          sideOffset={4}
          collisionPadding={8}
          className={cn(
            "bg-card shadow-elev-3 z-[60] min-w-44 rounded-lg border p-1",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          )}
        >
          {items.map((it, i) =>
            it === "separator" ? (
              <DM.Separator key={`sep${i}`} className="bg-border -mx-1 my-1 h-px" />
            ) : (
              <DM.Item
                key={it.label}
                disabled={it.disabled}
                onSelect={it.onSelect}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none select-none",
                  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                  it.destructive
                    ? "text-destructive data-[highlighted]:bg-destructive/10"
                    : "data-[highlighted]:bg-muted",
                )}
              >
                {it.icon && <it.icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />}
                <span className="flex-1">{it.label}</span>
                {it.hint && <span className="text-muted-foreground text-xs">{it.hint}</span>}
              </DM.Item>
            ),
          )}
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}
