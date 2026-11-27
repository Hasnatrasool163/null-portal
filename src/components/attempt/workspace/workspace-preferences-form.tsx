"use client";
import { RotateCcw } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_PREFERENCES,
  type WorkspacePreferences,
} from "@/shared/schemas/secondary";
import { useWorkspacePreferences } from "./use-workspace-preferences";
import { useSaveWorkspacePreferences } from "./use-save-workspace-preferences";

const ROWS: {
  id: string;
  label: string;
  key: keyof WorkspacePreferences;
  options: [string, string][];
}[] = [
  { id: "pref-theme", label: "Exam theme", key: "theme", options: [["light", "Light"], ["dark", "Dark"], ["high-contrast", "High contrast"]] },
  { id: "pref-font", label: "Question text size", key: "fontSize", options: [["sm", "Compact"], ["md", "Standard"], ["lg", "Large"]] },
  { id: "pref-layout", label: "Exam layout", key: "layout", options: [["single", "One question at a time"], ["scroll", "Exam paper (all questions)"]] },
  { id: "pref-palette", label: "Question navigator", key: "palettePosition", options: [["side", "Side panel"], ["bottom", "Bottom bar"]] },
  { id: "pref-timer", label: "Timer", key: "timerStyle", options: [["always", "Always prominent"], ["subtle", "Subtle until the last 5 minutes"]] },
];

/** The workspace preferences form. Used by the in-exam dialog and the Settings page. */
export function WorkspacePreferencesForm({ columns = 2 }: { columns?: 1 | 2 }) {
  const { prefs } = useWorkspacePreferences();
  const save = useSaveWorkspacePreferences();

  const isDefault = (Object.keys(DEFAULT_PREFERENCES) as (keyof WorkspacePreferences)[]).every(
    (k) => prefs[k] === DEFAULT_PREFERENCES[k],
  );

  return (
    <div className="space-y-4 text-sm">
      <div className={columns === 2 ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
        {ROWS.map((r) => (
          <div key={r.id} className="space-y-1.5">
            <label htmlFor={r.id} className="font-medium">
              {r.label}
            </label>
            <Select
              id={r.id}
              value={prefs[r.key]}
              onChange={(e) =>
                save.mutate({ [r.key]: e.target.value } as Partial<WorkspacePreferences>)
              }
            >
              {r.options.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
        ))}
      </div>

      <div data-qsize={prefs.fontSize} className="bg-muted/50 rounded-lg border p-3" aria-label="Text size preview">
        <p className="text-muted-foreground mb-1 text-xs">Preview</p>
        <p className="q-text">Which data structure gives O(1) average lookup by key?</p>
      </div>

      <div className="flex items-center justify-between gap-2 border-t pt-4">
        <p className="text-muted-foreground text-xs" role="status" aria-live="polite">
          {save.isPending ? "Saving…" : "Changes save automatically and apply on every device."}
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={isDefault || save.isPending}
          onClick={() => save.mutate(DEFAULT_PREFERENCES)}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset to defaults
        </Button>
      </div>
    </div>
  );
}
