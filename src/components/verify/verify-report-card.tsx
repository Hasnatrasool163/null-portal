import { format } from "date-fns";
import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { VerificationPublic } from "@/shared/schemas/secondary";
import { VerifyLookup } from "./verify-lookup";
import { VerifyStatusLabel, type VerifyStatus } from "./verify-status";

const HEADLINE: Record<VerifyStatus, { title: string; text: string }> = {
  VALID: {
    title: "Report verified",
    text: "This report is genuine and matches the current result.",
  },
  SUPERSEDED: {
    title: "Report superseded",
    text: "Genuine, but the grade was updated after this PDF was issued. Ask the candidate for the latest report.",
  },
  REVOKED: {
    title: "Report revoked",
    text: "This report was withdrawn by the institution and is no longer valid.",
  },
};

/**
 * Outcome of looking up a verification code: the report's status and public
 * details, or "not found" with a box to try another code. Server component.
 */
export function VerifyReportCard({
  code,
  data,
}: {
  code: string;
  data: VerificationPublic | null;
}) {
  const status = data?.status;
  const Icon = !data
    ? AlertTriangle
    : status === "VALID"
      ? ShieldCheck
      : ShieldAlert;
  const iconTone = !data
    ? "bg-destructive/10 text-destructive"
    : status === "VALID"
      ? "bg-success/10 text-success"
      : "bg-warning/10 text-warning";

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            iconTone,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">
            {data && status ? HEADLINE[status].title : "Code not found"}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {data && status ? (
              HEADLINE[status].text
            ) : (
              <>
                No issued report matches{" "}
                <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs">
                  {code}
                </code>
                . Check the code and try again.
              </>
            )}
          </p>
        </div>
      </div>

      {data && status ? (
        <dl className="mt-5 divide-y border-t text-sm">
          {[
            ["Status", <VerifyStatusLabel key="s" status={status} />],
            ["Exam", data.examTitle],
            ["Candidate", data.maskedCandidateName],
            [
              "Score",
              <span key="sc" className="tabular-nums">
                {data.score} / {data.totalMarks}
                <span className="text-muted-foreground">
                  {" "}
                  · {data.percentage}% · {data.scoreBand}
                </span>
              </span>,
            ],
            // "PP, p" keeps the comma before the time (formatDateTime omits it).
            ["Issued", format(new Date(data.issuedAt), "PP, p")],
            [
              "Code",
              <span key="c" className="font-mono text-xs tracking-wider">
                {data.code}
              </span>,
            ],
          ].map(([k, v]) => (
            <div
              key={String(k)}
              className="grid grid-cols-[7rem_1fr] items-center gap-4 py-2.5"
            >
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="min-w-0 font-medium break-words">{v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="mt-5 border-t pt-5">
          <VerifyLookup initial={code} />
        </div>
      )}
    </Card>
  );
}
