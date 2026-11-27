import { cn } from "@/lib/utils";
import type { VerificationPublic } from "@/shared/schemas/secondary";

export type VerifyStatus = VerificationPublic["status"];

/** One quiet visual language for report status: a small dot + plain label, no coloured pills. */
export const VERIFY_STATUSES: {
  key: VerifyStatus;
  label: string;
  dot: string;
  text: string;
}[] = [
  {
    key: "VALID",
    label: "Valid",
    dot: "bg-success",
    text: "Genuine and current.",
  },
  {
    key: "SUPERSEDED",
    label: "Superseded",
    dot: "bg-warning",
    text: "Genuine, but the grade changed later.",
  },
  {
    key: "REVOKED",
    label: "Revoked",
    dot: "bg-destructive",
    text: "Withdrawn by the institution.",
  },
];

export function VerifyStatusLabel({
  status,
  className,
}: {
  status: VerifyStatus;
  className?: string;
}) {
  const s = VERIFY_STATUSES.find((x) => x.key === status) ?? VERIFY_STATUSES[2];
  return (
    <span
      className={cn("inline-flex items-center gap-2 font-medium", className)}
    >
      <span className={cn("h-2 w-2 rounded-full", s.dot)} aria-hidden="true" />
      {s.label}
    </span>
  );
}
