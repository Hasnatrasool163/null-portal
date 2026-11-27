"use client";
import {
  GraduationCap,
  KeyRound,
  ShieldCheck,
  UserCheck,
  UserCog,
  UserX,
  type LucideIcon,
} from "lucide-react";
import { RowMenu } from "@/components/ui/row-menu";
import { Tooltip } from "@/components/ui/tooltip";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { initials } from "@/lib/format";
import { ROLE_LABEL, type Role } from "@/shared/schemas/auth";
import type { AdminUser } from "@/shared/schemas/user";

const ROLE_ICON: Record<Role, LucideIcon> = {
  ADMIN: ShieldCheck,
  EXAMINER: UserCog,
  CANDIDATE: GraduationCap,
};

/**
 * One page of users with a per-row action menu. The signed-in admin's own row
 * has no actions: another admin must change it.
 */
export function UsersTable({
  users,
  meId,
  onChangeRole,
  onResetPassword,
  onDeactivate,
  onReactivate,
}: {
  users: AdminUser[];
  meId: string;
  onChangeRole: (u: AdminUser) => void;
  onResetPassword: (u: AdminUser) => void;
  onDeactivate: (u: AdminUser) => void;
  onReactivate: (u: AdminUser) => void;
}) {
  return (
    <Table>
      <THead>
        <TR>
          <TH>Name</TH>
          <TH>Role</TH>
          <TH>Status</TH>
          <TH className="text-right">Actions</TH>
        </TR>
      </THead>
      <TBody>
        {users.map((u) => {
          const isMe = u.id === meId;
          const RoleIcon = ROLE_ICON[u.role];
          return (
            <TR key={u.id}>
              <TD>
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                      u.isActive
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground"
                    }`}
                    aria-hidden="true"
                  >
                    {initials(u.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {u.name}
                      {isMe && (
                        <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {u.email}
                    </p>
                  </div>
                </div>
              </TD>
              <TD>
                <span className="inline-flex items-center gap-2 text-sm">
                  <RoleIcon
                    className="text-muted-foreground h-4 w-4"
                    aria-hidden="true"
                  />
                  {ROLE_LABEL[u.role]}
                </span>
              </TD>
              <TD>
                <span className="inline-flex items-center gap-2 text-sm">
                  <span
                    className={`h-2 w-2 rounded-full ${u.isActive ? "bg-success" : "bg-destructive"}`}
                    aria-hidden="true"
                  />
                  {u.isActive ? "Active" : "Deactivated"}
                </span>
              </TD>
              <TD className="text-right">
                {isMe ? (
                  <Tooltip content="This is you. Another admin must change your account.">
                    <span
                      tabIndex={0}
                      className="text-muted-foreground inline-flex h-8 items-center px-2 text-xs"
                    >
                      —
                    </span>
                  </Tooltip>
                ) : (
                  <RowMenu
                    label={`Actions for ${u.name}`}
                    items={[
                      {
                        label: "Change role…",
                        icon: UserCog,
                        onSelect: () => onChangeRole(u),
                      },
                      {
                        label: "Reset password…",
                        icon: KeyRound,
                        onSelect: () => onResetPassword(u),
                      },
                      "separator",
                      u.isActive
                        ? {
                            label: "Deactivate",
                            icon: UserX,
                            destructive: true,
                            onSelect: () => onDeactivate(u),
                          }
                        : {
                            label: "Reactivate",
                            icon: UserCheck,
                            onSelect: () => onReactivate(u),
                          },
                    ]}
                  />
                )}
              </TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
