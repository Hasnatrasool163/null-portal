"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/misc";
import { applyFieldErrors, usersApi, type IssuedCredentials } from "@/lib/api";
import { ROLES, ROLE_LABEL } from "@/shared/schemas/auth";
import { createUserSchema, type CreateUserInput } from "@/shared/schemas/user";

/** New account form. Server field errors (e.g. email taken) land on their inputs. */
export function CreateUserForm({
  onDone,
  onCancel,
}: {
  onDone: (r: IssuedCredentials) => void;
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
      onDone(await usersApi.create(values));
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
