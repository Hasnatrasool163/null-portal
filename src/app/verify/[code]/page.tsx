import { format } from "date-fns";
import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { secondaryService } from "@/server/services/secondary.service";
import { VerifyLookup } from "@/components/verify-lookup";
import { VerifyFrame } from "@/components/verify-frame";
import {
  VerifyStatusLabel,
  type VerifyStatus,
} from "@/components/verify-status";
import { BackButton } from "@/components/ui/back-button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verify a report" };

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

export default async function VerifyReportPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  let data = null;
  try {
    data = await secondaryService.verifyReportCode(code);
  } catch {
    data = null;
  }
  const status = data?.status as VerifyStatus | undefined;
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
    <VerifyFrame>
      <div className="flex justify-center pt-2 sm:pt-6">
        <div className="animate-page-in w-full max-w-lg space-y-3">
          <div className="flex flex-wrap gap-2">
            <BackButton href="/" label="Back to home" />
            <BackButton href="/verify" label="Verify another code" />
          </div>
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
          <p className="text-muted-foreground px-1 text-center text-xs">
            Only the exam, score and masked initials are shown. Never emails or
            answers.
          </p>
        </div>
      </div>
    </VerifyFrame>
  );
}
