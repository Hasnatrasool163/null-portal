"use client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CreateUserForm } from "@/components/users/create-user-form";
import type { IssuedCredentials } from "@/lib/api";

export function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (r: IssuedCredentials) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="New user">
        {open && (
          <CreateUserForm
            onCancel={() => onOpenChange(false)}
            onDone={onCreated}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
