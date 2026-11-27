"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { PasswordField } from "@/components/settings/password-field";
import { applyFieldErrors, authApi } from "@/lib/api";
import { passwordSchema } from "@/shared/schemas/auth";

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "New password must be different from current password",
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

/** Change the signed-in user's password; the server signs out their other sessions. */
export function ChangePasswordForm() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: PasswordFormValues) {
    try {
      await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      reset();
      toast.success(
        "Password updated. Other active sessions have been signed out.",
      );
    } catch (e) {
      if (!applyFieldErrors(e, setError)) {
        toast.error(
          e instanceof Error ? e.message : "Could not update password",
        );
      }
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-md space-y-4"
      noValidate
    >
      <PasswordField
        id="pw-current"
        label="Current password"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        registerProps={register("currentPassword")}
      />
      <PasswordField
        id="pw-new"
        label="New password"
        autoComplete="new-password"
        error={errors.newPassword?.message}
        hint="At least 8 characters, including a letter and a number."
        registerProps={register("newPassword")}
      />
      <PasswordField
        id="pw-confirm"
        label="Confirm new password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        registerProps={register("confirmPassword")}
      />
      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          Update password
        </Button>
      </div>
    </form>
  );
}
