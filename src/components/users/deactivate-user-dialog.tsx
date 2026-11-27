"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { AdminUser } from "@/shared/schemas/user";

/** Confirmation before deactivating `user`; open while `user` is non-null. */
export function DeactivateUserDialog({
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
        title="Deactivate user?"
        description={`${user?.name} will be logged out and unable to sign in until reactivated. Their data is kept.`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => user && onConfirm(user)}
          >
            Deactivate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
