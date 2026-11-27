"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ApiClientError, applyFieldErrors, authApi } from "@/lib/api";
import { loginSchema, type LoginInput } from "@/shared/schemas/auth";
import { DEMO_PASSWORD } from "./role-config";

/**
 * Sign-in form state and submission. A SIGN_IN_FAILED error (e.g. session already
 * active elsewhere) is shown as an inline banner; field errors go next to inputs.
 */
export function useLoginForm() {
  const router = useRouter();
  const [signInError, setSignInError] = useState<string | null>(null);
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const { setError, setValue } = form;

  async function onSubmit(values: LoginInput) {
    setSignInError(null);
    try {
      await authApi.login(values);
      router.replace("/dashboard");
      router.refresh();
    } catch (e) {
      if (e instanceof ApiClientError && e.code === "SIGN_IN_FAILED") {
        setSignInError(e.message);
        return;
      }
      if (!applyFieldErrors(e, setError))
        toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  function fillDemo(email: string) {
    setValue("email", email, { shouldValidate: true });
    setValue("password", DEMO_PASSWORD, { shouldValidate: true });
  }

  return { form, submit: form.handleSubmit(onSubmit), signInError, fillDemo };
}
