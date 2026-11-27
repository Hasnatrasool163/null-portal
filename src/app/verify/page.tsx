import { QrCode, ScanLine, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { VerifyFrame } from "@/components/verify-frame";
import { VerifyLookup } from "@/components/verify-lookup";
import { VERIFY_STATUSES } from "@/components/verify-status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verify a report" };

export default function VerifyLandingPage() {
  return (
    <VerifyFrame>
      <div className="flex min-h-[calc(100dvh-10rem)] items-center justify-center">
        <div className="animate-page-in w-full max-w-lg space-y-4">
          <Card className="p-6 sm:p-8">
            <div className="mb-6 flex items-start gap-4">
              <span className="bg-accent text-accent-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <h1 className="text-xl font-semibold tracking-tight">
                  Verify a result report
                </h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Check that a result PDF is genuine and still current. No
                  account needed.
                </p>
              </div>
            </div>
            <VerifyLookup />

            <div className="mt-6 space-y-6 border-t pt-6">
              <section aria-labelledby="where-heading" className="space-y-3">
                <h2 id="where-heading" className="text-sm font-semibold">
                  Where to find the code
                </h2>
                <ul className="text-muted-foreground space-y-2.5 text-sm">
                  <li className="flex gap-2.5">
                    <QrCode
                      className="text-foreground/70 mt-0.5 h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    Scan the QR code on the report.
                  </li>
                  <li className="flex gap-2.5">
                    <ScanLine
                      className="text-foreground/70 mt-0.5 h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    Or type the code printed under it.
                  </li>
                </ul>
              </section>

              <section aria-labelledby="means-heading" className="space-y-3">
                <h2 id="means-heading" className="text-sm font-semibold">
                  What the result means
                </h2>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2.5 text-sm">
                  {VERIFY_STATUSES.map((s) => (
                    <div key={s.label} className="contents">
                      <dt className="flex items-center gap-2 font-medium">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${s.dot}`}
                          aria-hidden="true"
                        />
                        {s.label}
                      </dt>
                      <dd className="text-muted-foreground">{s.text}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>
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
