"use client";
import { useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDebounce } from "use-debounce";
import { Copy, Plus, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Pagination } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { Badge, Skeleton, Spinner } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState, PageHeader } from "@/components/ui/blocks";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api, applyFieldErrors } from "@/lib/api-client";
import { ROLES, ROLE_LABEL, type Role } from "@/shared/schemas/auth";
import {
  createUserSchema,
  type AdminUser,
  type AdminUserList,
  type CreateUserInput,
} from "@/shared/schemas/user";

const PAGE_SIZE = 10;

function CreateUserForm({
  onDone,
  onCancel,
}: {
  onDone: (r: { user: { name: string; email: string }; tempPassword: string }) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: "EXAMINER" },
  });
  async function submit(values: CreateUserInput) {
    try {
      onDone(
        await api("/api/admin/users", { method: "POST", body: values }),
      );
    } catch (e) {
      if (!applyFieldErrors(e, setError))
        toast.error(e instanceof Error ? e.message : "Could not create user");
    }
  }
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <Field label="Full name" htmlFor="u-name" error={errors.name?.message}>
        <Input id="u-name" aria-invalid={!!errors.name} {...register("name")} />
      </Field>
      <Field label="Email" htmlFor="u-email" error={errors.email?.message}>
        <Input
          id="u-email"
          type="email"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
      </Field>
      <Field
        label="Role"
        htmlFor="u-role"
        error={errors.role?.message}
        hint="A temporary password is generated and shown once. No email is sent."
      >
        <Select id="u-role" {...register("role")}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          Create user
        </Button>
      </div>
    </form>
  );
}

export function UsersManager({ meId }: { meId: string }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [q] = useDebounce(search, 300);
  const [role, setRole] = useState<Role | "">("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{
    name: string;
    email: string;
    tempPassword: string;
  } | null>(null);
  const [toggling, setToggling] = useState<AdminUser | null>(null);

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
  });
  if (q) params.set("q", q);
  if (role) params.set("role", role);

  const list = useQuery({
    queryKey: ["admin-users", q, role, page],
    queryFn: () => api<AdminUserList>(`/api/admin/users?${params}`),
    placeholderData: keepPreviousData,
  });

  const patch = useMutation({
    mutationFn: (v: { id: string; role?: Role; isActive?: boolean }) =>
      api<AdminUser>(`/api/admin/users/${v.id}`, {
        method: "PATCH",
        body: { role: v.role, isActive: v.isActive },
      }),
    onSuccess: () => {
      toast.success("User updated");
      setToggling(null);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e) => {
      setToggling(null);
      toast.error(e.message);
    },
  });

  const total = list.data?.total ?? 0;

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

      <div className="flex flex-wrap gap-3">
        <SearchInput
          label="Search users"
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          phrases={["candidate3", "examiner1@demo.test", "Ada", "admin"]}
        />
        <Select
          className="w-48"
          aria-label="Filter by role"
          value={role}
          onChange={(e) => {
            setRole(e.target.value as Role | "");
            setPage(1);
          }}
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </Select>
      </div>

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
            {list.data.users.map((u) => {
              const isMe = u.id === meId;
              return (
                <TR key={u.id}>
                  <TD>
                    <p className="font-medium">
                      {u.name}
                      {isMe && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground text-xs">{u.email}</p>
                  </TD>
                  <TD>
                    <Select
                      className="h-9 w-40"
                      aria-label={`Role for ${u.name}`}
                      value={u.role}
                      disabled={isMe || patch.isPending}
                      onChange={(e) =>
                        patch.mutate({ id: u.id, role: e.target.value as Role })
                      }
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </Select>
                  </TD>
                  <TD>
                    {u.isActive ? (
                      <Badge>Active</Badge>
                    ) : (
                      <Badge className="bg-destructive/10 text-destructive">
                        Deactivated
                      </Badge>
                    )}
                  </TD>
                  <TD className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isMe}
                      onClick={() =>
                        u.isActive
                          ? setToggling(u)
                          : patch.mutate({ id: u.id, isActive: true })
                      }
                    >
                      {u.isActive ? (
                        <UserX className="h-4 w-4" />
                      ) : (
                        <UserCheck className="h-4 w-4" />
                      )}
                      {u.isActive ? "Deactivate" : "Reactivate"}
                    </Button>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPage={setPage}
        noun="users"
      />

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent title="New user">
          {creating && (
            <CreateUserForm
              onCancel={() => setCreating(false)}
              onDone={(r) => {
                setCreating(false);
                setCreated({ ...r.user, tempPassword: r.tempPassword });
                qc.invalidateQueries({ queryKey: ["admin-users"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={created !== null} onOpenChange={(o) => !o && setCreated(null)}>
        <DialogContent
          title="User created"
          description="Copy the temporary password now. It cannot be shown again."
        >
          {created && (
            <div className="space-y-4">
              <p className="text-sm">
                <span className="font-medium">{created.name}</span> (
                {created.email})
              </p>
              <div className="bg-muted flex items-center justify-between rounded-md p-3">
                <code className="font-mono text-base">
                  {created.tempPassword}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(created.tempPassword);
                    toast.success("Copied");
                  }}
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setCreated(null)}>Done</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={toggling !== null} onOpenChange={(o) => !o && setToggling(null)}>
        <DialogContent
          title="Deactivate user?"
          description={`${toggling?.name} will be logged out and unable to sign in until reactivated. Their data is kept.`}
        >
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setToggling(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={patch.isPending}
              onClick={() =>
                toggling && patch.mutate({ id: toggling.id, isActive: false })
              }
            >
              Deactivate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
