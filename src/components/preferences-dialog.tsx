"use client";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { api } from "@/lib/api-client";
import {
  DEFAULT_PREFERENCES,
  type WorkspacePreferences,
} from "@/shared/schemas/secondary";

export function useWorkspacePreferences() {
  const { setTheme } = useTheme();
  const query = useQuery({
    queryKey: ["me-preferences"],
    queryFn: () => api<WorkspacePreferences>("/api/me/preferences"),
  });
  const prefs = query.data ?? DEFAULT_PREFERENCES;

  useEffect(() => {
    const root = document.documentElement;
    if (prefs.theme === "high-contrast") {
      setTheme("light");
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
      setTheme(prefs.theme);
    }
  }, [prefs.theme, setTheme]);

  return { prefs, isLoading: query.isPending };
}

export function PreferencesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const { prefs } = useWorkspacePreferences();

  const save = useMutation({
    mutationFn: (patch: Partial<WorkspacePreferences>) =>
      api<WorkspacePreferences>("/api/me/preferences", {
        method: "PATCH",
        body: patch,
      }),
    onSuccess: (next) => {
      qc.setQueryData(["me-preferences"], next);
      toast.success("Workspace preferences saved");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Workspace preferences"
        description="Saved to your account and applied automatically in every exam."
      >
        <div className="space-y-4 text-sm">
          <div className="space-y-1">
            <label htmlFor="pref-theme" className="font-medium">
              Theme
            </label>
            <Select
              id="pref-theme"
              value={prefs.theme}
              onChange={(e) =>
                save.mutate({
                  theme: e.target.value as WorkspacePreferences["theme"],
                })
              }
            >
              <option value="light">Warm paper (Light)</option>
              <option value="dark">Dark</option>
              <option value="high-contrast">High contrast</option>
            </Select>
          </div>

          <div className="space-y-1">
            <label htmlFor="pref-font" className="font-medium">
              Question font size
            </label>
            <Select
              id="pref-font"
              value={prefs.fontSize}
              onChange={(e) =>
                save.mutate({
                  fontSize: e.target.value as WorkspacePreferences["fontSize"],
                })
              }
            >
              <option value="sm">Compact</option>
              <option value="md">Standard</option>
              <option value="lg">Large</option>
            </Select>
          </div>

          <div className="space-y-1">
            <label htmlFor="pref-layout" className="font-medium">
              Exam layout
            </label>
            <Select
              id="pref-layout"
              value={prefs.layout}
              onChange={(e) =>
                save.mutate({
                  layout: e.target.value as WorkspacePreferences["layout"],
                })
              }
            >
              <option value="single">One question at a time</option>
              <option value="scroll">Scrolling paper (all questions)</option>
            </Select>
          </div>

          <div className="space-y-1">
            <label htmlFor="pref-palette" className="font-medium">
              Question palette position
            </label>
            <Select
              id="pref-palette"
              value={prefs.palettePosition}
              onChange={(e) =>
                save.mutate({
                  palettePosition: e.target
                    .value as WorkspacePreferences["palettePosition"],
                })
              }
            >
              <option value="side">Side panel</option>
              <option value="bottom">Bottom bar</option>
            </Select>
          </div>

          <div className="space-y-1">
            <label htmlFor="pref-timer" className="font-medium">
              Timer visibility
            </label>
            <Select
              id="pref-timer"
              value={prefs.timerStyle}
              onChange={(e) =>
                save.mutate({
                  timerStyle: e.target
                    .value as WorkspacePreferences["timerStyle"],
                })
              }
            >
              <option value="always">Always visible</option>
              <option value="subtle">Subtle (expands under 5 min)</option>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
