"use client";
import { useState } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Eye, EyeOff, Lock } from "lucide-react";
import { FieldError } from "./field-error";
import { IconInput } from "./icon-input";

/** Password input with show/hide toggle and a Caps Lock warning. */
export function PasswordField({
  registration,
  error,
}: {
  registration: UseFormRegisterReturn<"password">;
  error?: string;
}) {
  const [showPw, setShowPw] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor="password" className="text-sm font-medium">
        Password
      </label>
      <IconInput
        id="password"
        type={showPw ? "text" : "password"}
        icon={Lock}
        autoComplete="current-password"
        invalid={!!error}
        aria-describedby={error ? "password-error" : undefined}
        onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
        {...registration}
        trailing={
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            aria-label={showPw ? "Hide password" : "Show password"}
            aria-pressed={showPw}
            className="text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-md transition-colors"
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
      />
      <FieldError id="password-error" msg={error} />
      {capsLock && (
        <p className="text-warning text-xs" role="status">
          Caps Lock is on.
        </p>
      )}
    </div>
  );
}
