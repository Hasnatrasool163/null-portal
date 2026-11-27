import { AlertCircle } from "lucide-react";

/** Banner for a rejected sign-in (message comes from the server). */
export function SignInError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="animate-page-in border-destructive/30 bg-destructive/5 flex gap-2.5 rounded-md border p-3 text-sm"
    >
      <AlertCircle
        className="text-destructive mt-0.5 h-4 w-4 shrink-0"
        aria-hidden="true"
      />
      <div className="space-y-0.5">
        <p className="font-medium">Sign-in failed</p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {message}
        </p>
      </div>
    </div>
  );
}
