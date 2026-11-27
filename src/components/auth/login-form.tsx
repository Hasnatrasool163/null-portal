"use client";
import { ArrowRight, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { FieldError } from "./fields/field-error";
import { IconInput } from "./fields/icon-input";
import { PasswordField } from "./fields/password-field";
import { SignInError } from "./sign-in-error";
import { useLoginForm } from "./use-login-form";

/** Email/password form plus the "fill demo account" shortcut for the selected role. */
export function LoginForm({ demo }: { demo: { label: string; email: string } }) {
  const {
    form: {
      register,
      formState: { errors, isSubmitting },
    },
    submit,
    signInError,
    fillDemo,
  } = useLoginForm();

  return (
    <>
      <form onSubmit={submit} noValidate className="space-y-3.5">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <IconInput
            id="email"
            type="email"
            icon={Mail}
            autoComplete="email"
            placeholder="you@example.com"
            invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
          <FieldError id="email-error" msg={errors.email?.message} />
        </div>

        <PasswordField
          registration={register("password")}
          error={errors.password?.message}
        />

        {signInError && <SignInError message={signInError} />}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          Sign in
          {!isSubmitting && (
            <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-0.5" />
          )}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => fillDemo(demo.email)}
        className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-xs transition-colors"
      >
        <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
        Fill demo {demo.label.toLowerCase()}
        <span className="font-mono">({demo.email})</span>
      </button>
    </>
  );
}
