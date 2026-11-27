import { format } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { secondaryService } from "@/server/services/secondary.service";
import { VerifyLookup } from "@/components/verify-lookup";
import { BRAND } from "@/lib/brand";
import { VerifyFrame } from "@/components/verify-frame";
import { BackButton } from "@/components/ui/back-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verify Report" };

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

  return (
    <VerifyFrame>
      <div className="mx-auto w-full max-w-xl space-y-4">
        <BackButton href="/verify" label="Verify another code" />
        <Card className="animate-page-in">
          <CardHeader>
            <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
              {BRAND.name} · Result verification
            </p>
            <CardTitle className="mt-1 flex items-center gap-2 text-xl">
              {data ? (
                data.status === "VALID" ? (
                  <ShieldCheck className="text-success h-6 w-6" />
                ) : (
                  <ShieldAlert className="text-warning h-6 w-6" />
                )
              ) : (
                <AlertTriangle className="text-destructive h-6 w-6" />
              )}
              {data ? "Examination Result Verification" : "Code Not Found"}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 text-sm">
            {!data ? (
              <p className="text-muted-foreground">
                No issued result report matches verification code{" "}
                <code className="bg-muted rounded px-1.5 py-0.5 font-mono">
                  {code}
                </code>
                . Check the code and try again.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    className={
                      data.status === "VALID"
                        ? "bg-success/15 text-success"
                        : data.status === "SUPERSEDED"
                          ? "bg-warning/15 text-warning"
                          : "bg-destructive/15 text-destructive"
                    }
                  >
                    {data.status === "VALID" && (
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    )}
                    {data.status}
                  </Badge>
                </div>

                {data.status === "SUPERSEDED" && (
                  <p className="bg-warning/10 text-warning rounded-md p-3 text-xs">
                    This report was superseded because the candidate&apos;s
                    grade was updated after this PDF was issued. Ask for the
                    latest PDF.
                  </p>
                )}

                <dl className="divide-y rounded-md border">
                  <div className="flex justify-between gap-4 px-3 py-2.5">
                    <dt className="text-muted-foreground">Exam</dt>
                    <dd className="text-right font-medium">{data.examTitle}</dd>
                  </div>
                  <div className="flex justify-between gap-4 px-3 py-2.5">
                    <dt className="text-muted-foreground">
                      Candidate (masked)
                    </dt>
                    <dd className="font-medium">{data.maskedCandidateName}</dd>
                  </div>
                  <div className="flex justify-between gap-4 px-3 py-2.5">
                    <dt className="text-muted-foreground">Score</dt>
                    <dd className="font-medium">
                      {data.score} / {data.totalMarks} ({data.percentage}% ·{" "}
                      {data.scoreBand})
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 px-3 py-2.5">
                    <dt className="text-muted-foreground">Issued</dt>
                    <dd>{format(new Date(data.issuedAt), "PP p")}</dd>
                  </div>
                  <div className="flex justify-between gap-4 px-3 py-2.5">
                    <dt className="text-muted-foreground">Verification code</dt>
                    <dd className="font-mono text-xs">{data.code}</dd>
                  </div>
                </dl>

                <p className="text-muted-foreground text-xs">
                  For candidate privacy, email addresses and internal IDs are
                  never exposed on public verification pages.
                </p>
              </>
            )}

            {!data && <VerifyLookup initial={code} />}
          </CardContent>
        </Card>
      </div>
    </VerifyFrame>
  );
}
