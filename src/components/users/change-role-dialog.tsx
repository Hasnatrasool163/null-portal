"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ROLES, ROLE_LABEL, type Role } from "@/shared/schemas/auth";
import type { AdminUser } from "@/shared/schemas/user";

const ROLE_NOTE: Record<Role, string> = {
  ADMIN: "Can manage users and oversee every exam. Cannot author or grade.",
  EXAMINER: "Can build question banks, run exams and grade their own exams.",
  CANDIDATE: "Can sit exams they are enrolled in and see published results.",
};

/** Pick a new role for `user`; open while `user` is non-null. */
export function ChangeRoleDialog({
  user,
  pending,
  onSave,
  onClose,
}: {
  user: AdminUser | null;
  pending: boolean;
  onSave: (role: Role) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={user !== null} onOpenChange={(o) => !o && onClose()}>
      {user && (
        <ChangeRoleContent
          user={user}
          pending={pending}
          onSave={onSave}
          onClose={onClose}
        />
      )}
    </Dialog>
  );
}

// Mounted per open, so the draft role always starts at the user's current role.
function ChangeRoleContent({
  user,
  pending,
  onSave,
  onClose,
}: {
  user: AdminUser;
  pending: boolean;
  onSave: (role: Role) => void;
  onClose: () => void;
}) {
  const [role, setRole] = useState<Role>(user.role);
  return (
    <DialogContent
      title="Change role"
      description={`${user.name} · ${user.email}`}
    >
      <div className="space-y-4 text-sm">
        <div className="space-y-1.5">
          <label htmlFor="role-edit" className="font-medium">
            Role
          </label>
          <Select
            id="role-edit"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
          <p className="text-muted-foreground text-xs">{ROLE_NOTE[role]}</p>
        </div>
        <p className="bg-muted/60 rounded-md px-3 py-2.5 text-xs">
          The change applies on their next request. It is recorded in the audit
          log.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={role === user.role || pending}
            onClick={() => onSave(role)}
          >
            {pending && <Spinner />}
            Save role
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}
