"use client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { WorkspacePreferencesForm } from "./workspace/workspace-preferences-form";

export { useWorkspacePreferences } from "./workspace/use-workspace-preferences";
export { useApplyWorkspaceTheme } from "./workspace/use-apply-workspace-theme";
export { WorkspacePreferencesForm };

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
