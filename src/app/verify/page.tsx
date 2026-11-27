import { QrCode, ScanLine, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { VerifyFrame } from "@/components/verify-frame";
import { VerifyLookup } from "@/components/verify-lookup";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verify a report" };

const STATUSES = [
  {
    label: "Valid",
    tone: "bg-success/12 text-success",
    text: "Genuine and matches the current result.",
  },
  {
    label: "Superseded",
    tone: "bg-warning/12 text-warning",
    text: "Genuine, but the grade changed after it was issued.",
  },
  {
    label: "Revoked",
    tone: "bg-destructive/12 text-destructive",
    text: "Withdrawn by the institution.",
  },
];

export default function VerifyLandingPage() {
  return (
    <VerifyFrame>
      <div className="flex justify-center">
        <div className="animate-page-in grid w-full max-w-4xl gap-4 md:grid-cols-[1.35fr_1fr]">
          <Card className="space-y-6 p-6 sm:p-8">
            <div className="space-y-3">
              <span className="bg-success/12 text-success flex h-11 w-11 items-center justify-center rounded-lg">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <h1 className="text-2xl font-semibold tracking-tight">
                Verify a result report
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Confirm a result PDF is genuine and still current. No account
                needed. Only the exam, score and masked initials are shown,
                never emails or answers.
              </p>
            </div>
            <VerifyLookup />
          </Card>

          <Card className="space-y-5 p-6">
            <div className="space-y-3">
              <h2 className="text-sm font-semibold">Where to find the code</h2>
              <ul className="text-muted-foreground space-y-2.5 text-sm">
                <li className="flex gap-2.5">
                  <QrCode
                    className="text-primary mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  Scan the QR code on the report to open this check directly.
                </li>
                <li className="flex gap-2.5">
                  <ScanLine
                    className="text-primary mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  Or type the code printed under the QR code.
                </li>
              </ul>
            </div>
            <div className="space-y-3 border-t pt-5">
              <h2 className="text-sm font-semibold">What the result means</h2>
              <ul className="space-y-2.5">
                {STATUSES.map((s) => (
                  <li
                    key={s.label}
                    className="flex items-start gap-2.5 text-sm"
                  >
                    <span
                      className={`${s.tone} mt-px shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold`}
                    >
                      {s.label}
                    </span>
                    <span className="text-muted-foreground">{s.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </VerifyFrame>
  );
}
