"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/misc";
import { api, applyFieldErrors } from "@/lib/api-client";
import {
  loginSchema,
  registerSchema,
  type RegisterInput,
} from "@/shared/schemas/auth";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const isRegister = mode === "register";
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(
      isRegister
        ? registerSchema
        : (loginSchema as unknown as typeof registerSchema),
    ),
  });

  async function onSubmit(values: RegisterInput) {
    try {
      await api(`/api/auth/${mode}`, { method: "POST", body: values });
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      if (!applyFieldErrors(e, setError))
        toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          {isRegister ? "Create your account" : "Welcome back"}
        </CardTitle>
        <CardDescription>
          {isRegister ? "It only takes a minute." : "Log in to continue."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          {isRegister && (
            <Field label="Name" htmlFor="name" error={errors.name?.message}>
              <Input
                id="name"
                autoComplete="name"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
            </Field>
          )}
          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
          </Field>
          <Field
            label="Password"
            htmlFor="password"
            error={errors.password?.message}
            hint={
              isRegister
                ? "At least 8 characters, with a letter and a number."
                : undefined
            }
          >
            <Input
              id="password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              aria-invalid={!!errors.password}
              {...register("password")}
            />
          </Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Spinner />}
            {isRegister ? "Sign up" : "Log in"}
          </Button>
        </form>
        <p className="text-muted-foreground mt-4 text-center text-sm">
          {isRegister ? "Already have an account? " : "New here? "}
          <Link
            className="text-primary font-medium underline"
            href={isRegister ? "/login" : "/register"}
          >
            {isRegister ? "Log in" : "Create an account"}
          </Link>
        </p>
        {!isRegister && (
          <p className="bg-muted text-muted-foreground mt-3 rounded-md p-2 text-center text-xs">
            Demo: user@demo.test / Demo1234
          </p>
        )}
      </CardContent>
    </Card>
  );
}
