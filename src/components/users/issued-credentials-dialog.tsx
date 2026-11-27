"use client";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/** A one-time temporary password, from creating a user or resetting theirs. */
export type IssuedPasswordNotice = {
  name: string;
  email: string;
  tempPassword: string;
  kind: "created" | "reset";
};

/** Shows a temporary password exactly once, with a copy button. */
export function IssuedCredentialsDialog({
  notice,
  onClose,
}: {
  notice: IssuedPasswordNotice | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={notice !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={notice?.kind === "reset" ? "Password reset" : "User created"}
        description={
          notice?.kind === "reset"
            ? "Copy the temporary password now. It cannot be shown again. Active sessions for this user have been signed out."
            : "Copy the temporary password now. It cannot be shown again."
        }
      >
        {notice && (
          <div className="space-y-4">
            <p className="text-sm">
              <span className="font-medium">{notice.name}</span> ({notice.email}
              )
            </p>
            <div className="bg-muted flex items-center justify-between rounded-md p-3">
              <code className="font-mono text-base">{notice.tempPassword}</code>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(notice.tempPassword);
                  toast.success("Copied");
                }}
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
            <div className="flex justify-end">
              <Button onClick={onClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
