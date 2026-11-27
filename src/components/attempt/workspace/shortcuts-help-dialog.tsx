"use client";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const SHORTCUTS: [label: string, keys: string][] = [
  ["Previous / Next question", "← / →"],
  ["Select option 1–9", "1 – 9"],
  ["Show this list", "?"],
  ["Open / close scratchpad", "S"],
  ["Flag / unflag question", "F"],
];

/** Reference list for the shortcuts handled by useWorkspaceShortcuts. */
export function ShortcutsHelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Keyboard shortcuts">
        <ul className="space-y-2 text-sm">
          {SHORTCUTS.map(([label, keys]) => (
            <li key={label} className="flex justify-between">
              <span>{label}</span>
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                {keys}
              </code>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground mt-3 text-xs">
          Shortcuts pause automatically while typing in a written answer box.
        </p>
      </DialogContent>
    </Dialog>
  );
}
