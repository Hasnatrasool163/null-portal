"use client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { AdminUser } from "@/shared/schemas/user";

/** Confirmation before issuing `user` a new temporary password. */
export function ResetPasswordDialog({
  user,
  pending,
  onConfirm,
  onClose,
}: {
  user: AdminUser | null;
  pending: boolean;
  onConfirm: (user: AdminUser) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={user !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title="Reset password?"
        description={`Generate a new one-time temporary password for ${user?.name}? All active sessions for this user will be signed out immediately.`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={pending} onClick={() => user && onConfirm(user)}>
            {pending && <Spinner />}
            Reset password
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
