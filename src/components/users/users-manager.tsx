"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/misc";
import { EmptyState, PageHeader } from "@/components/ui/blocks";
import { ChangeRoleDialog } from "@/components/users/change-role-dialog";
import { CreateUserDialog } from "@/components/users/create-user-dialog";
import { DeactivateUserDialog } from "@/components/users/deactivate-user-dialog";
import {
  IssuedCredentialsDialog,
  type IssuedPasswordNotice,
} from "@/components/users/issued-credentials-dialog";
import { ResetPasswordDialog } from "@/components/users/reset-password-dialog";
import { UsersFilters } from "@/components/users/users-filters";
import { UsersTable } from "@/components/users/users-table";
import { USERS_PAGE_SIZE, useUserList } from "@/components/users/use-user-list";
import { useUserMutations } from "@/components/users/use-user-mutations";
import { qk } from "@/lib/query-keys";
import type { AdminUser } from "@/shared/schemas/user";

/** Admin users page: filters, the paged user table, and the account dialogs. */
export function UsersManager({ meId }: { meId: string }) {
  const qc = useQueryClient();
  const { list, search, setSearch, role, setRole, page, setPage } =
    useUserList();
  const [creating, setCreating] = useState(false);
  const [issued, setIssued] = useState<IssuedPasswordNotice | null>(null);
  const [toggling, setToggling] = useState<AdminUser | null>(null);
  const [resetting, setResetting] = useState<AdminUser | null>(null);
  const [roleEditing, setRoleEditing] = useState<AdminUser | null>(null);

  const { update, resetPassword } = useUserMutations({
    onUpdated: () => {
      setToggling(null);
      setRoleEditing(null);
    },
    onUpdateFailed: () => setToggling(null),
    onPasswordReset: (r) => {
      setResetting(null);
      setIssued({
        name: r.user.name,
        email: r.user.email,
        tempPassword: r.tempPassword,
        kind: "reset",
      });
    },
    onPasswordResetFailed: () => setResetting(null),
  });

  return (
    <>
      <PageHeader
        title="Users and roles"
        subtitle="Create examiners and administrators, change roles, deactivate accounts."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New user
          </Button>
        }
      />

      <UsersFilters
        search={search}
        onSearch={setSearch}
        role={role}
        onRole={setRole}
      />

      {list.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : list.isError ? (
        <EmptyState
          title="Could not load users"
          text={list.error.message}
          action={<Button onClick={() => list.refetch()}>Try again</Button>}
        />
      ) : list.data.users.length === 0 ? (
        <EmptyState
          title="No users match"
          text="Try a different search or role filter."
        />
      ) : (
        <UsersTable
          users={list.data.users}
          meId={meId}
          onChangeRole={setRoleEditing}
          onResetPassword={setResetting}
          onDeactivate={setToggling}
          onReactivate={(u) => update.mutate({ id: u.id, isActive: true })}
        />
      )}

      <Pagination
        page={page}
        pageSize={USERS_PAGE_SIZE}
        total={list.data?.total ?? 0}
        onPage={setPage}
        noun="users"
      />

      <CreateUserDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(r) => {
          setCreating(false);
          setIssued({
            name: r.user.name,
            email: r.user.email,
            tempPassword: r.tempPassword,
            kind: "created",
          });
          qc.invalidateQueries({ queryKey: qk.users.all });
          qc.invalidateQueries({ queryKey: qk.users.examiners });
        }}
      />
      <IssuedCredentialsDialog
        notice={issued}
        onClose={() => setIssued(null)}
      />
      <ChangeRoleDialog
        user={roleEditing}
        pending={update.isPending}
        onSave={(r) =>
          roleEditing && update.mutate({ id: roleEditing.id, role: r })
        }
        onClose={() => setRoleEditing(null)}
      />
      <DeactivateUserDialog
        user={toggling}
        pending={update.isPending}
        onConfirm={(u) => update.mutate({ id: u.id, isActive: false })}
        onClose={() => setToggling(null)}
      />
      <ResetPasswordDialog
        user={resetting}
        pending={resetPassword.isPending}
        onConfirm={(u) => resetPassword.mutate(u.id)}
        onClose={() => setResetting(null)}
      />
    </>
  );
}
