"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { fieldClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Type a verification code instead of scanning the QR code on the PDF. */
export function VerifyLookup({
  initial = "",
  label = "Verification code",
  buttonLabel = "Verify",
}: {
  initial?: string;
  label?: string;
  buttonLabel?: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState(initial);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.replace(/[\s-]/g, "").toUpperCase();
    if (!/^[A-Z0-9]{8,64}$/.test(clean)) {
      setError("Enter the code printed under the QR code on the report.");
      return;
    }
    setError("");
    setPending(true);
    router.push(`/verify/${encodeURIComponent(clean)}`);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-2">
      <label htmlFor="verify-code" className="text-sm font-medium">
        {label}
      </label>
      <div className="flex flex-col gap-2 min-[420px]:flex-row">
        <div className="relative flex-1">
          <ScanLine
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            id="verify-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder="e.g. 7F3A9C21B0D4"
            aria-invalid={!!error}
            aria-describedby={error ? "verify-error" : undefined}
            className={cn(fieldClass, "h-11 pl-9 font-mono tracking-wider uppercase placeholder:font-sans placeholder:normal-case placeholder:tracking-normal")}
          />
        </div>
        <Button type="submit" size="lg" disabled={pending} className="w-full min-[420px]:w-auto">
          {pending ? <Spinner /> : <ArrowRight className="h-4 w-4" />}
          {buttonLabel}
        </Button>
      </div>
      {error && (
        <p id="verify-error" role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </form>
  );
}
