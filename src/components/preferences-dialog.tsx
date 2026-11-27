"use client";
import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { api } from "@/lib/api-client";
import {
  DEFAULT_PREFERENCES,
  type WorkspacePreferences,
} from "@/shared/schemas/secondary";

/** Server-persisted workspace preferences (they follow the user across devices). */
export function useWorkspacePreferences() {
  const query = useQuery({
    queryKey: ["me-preferences"],
    queryFn: () => api<WorkspacePreferences>("/api/me/preferences"),
  });
  return { prefs: query.data ?? DEFAULT_PREFERENCES, isLoading: query.isPending };
}

/**
 * Applies the workspace theme ONLY while the exam workspace is mounted, then
 * restores the user's normal app theme. Without this, the exam theme leaked
 * into every other page.
 */
export function useApplyWorkspaceTheme(theme: WorkspacePreferences["theme"]) {
  const { theme: appTheme, setTheme } = useTheme();
  // next-themes recreates setTheme whenever the theme changes, so keep the
  // latest one in a ref; otherwise the effects below would re-run in a loop.
  const setThemeRef = useRef(setTheme);
  const original = useRef<string | null>(null);

  useEffect(() => {
    setThemeRef.current = setTheme;
  }, [setTheme]);

  useEffect(() => {
    if (original.current === null) original.current = appTheme ?? "system";
    const root = document.documentElement;
    if (theme === "high-contrast") {
      root.classList.add("high-contrast");
      setThemeRef.current("light");
    } else {
      root.classList.remove("high-contrast");
      setThemeRef.current(theme);
    }
    // Only the workspace preference drives this; appTheme is read once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  useEffect(
    () => () => {
      document.documentElement.classList.remove("high-contrast");
      if (original.current) setThemeRef.current(original.current);
    },
    [],
  );
}

/** The workspace preferences form. Used by the in-exam dialog and the Settings page. */
export function WorkspacePreferencesForm({ columns = 2 }: { columns?: 1 | 2 }) {
  const qc = useQueryClient();
  const { prefs } = useWorkspacePreferences();

  const save = useMutation({
    mutationFn: (patch: Partial<WorkspacePreferences>) =>
      api<WorkspacePreferences>("/api/me/preferences", {
        method: "PATCH",
        body: patch,
      }),
    onMutate: (patch) => {
      // Optimistic: whatever is behind the form updates instantly.
      const prev = qc.getQueryData<WorkspacePreferences>(["me-preferences"]);
      qc.setQueryData(["me-preferences"], { ...(prev ?? DEFAULT_PREFERENCES), ...patch });
      return { prev };
    },
    onSuccess: (next) => qc.setQueryData(["me-preferences"], next),
    onError: (e, _patch, ctx) => {
      if (ctx?.prev) qc.setQueryData(["me-preferences"], ctx.prev);
      toast.error(e.message);
    },
  });

  const isDefault = (Object.keys(DEFAULT_PREFERENCES) as (keyof WorkspacePreferences)[]).every(
    (k) => prefs[k] === DEFAULT_PREFERENCES[k],
  );

  const rows: {
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

  return (
    <div className="space-y-4 text-sm">
      <div className={columns === 2 ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
        {rows.map((r) => (
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

/** In-exam access to the same settings (leaving the exam to change them isn't an option). */
export function PreferencesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Workspace preferences"
        description="Saved to your account and applied in every exam."
      >
        <WorkspacePreferencesForm />
      </DialogContent>
    </Dialog>
  );
}
