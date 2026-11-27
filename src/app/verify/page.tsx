import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { VerifyLookup } from "@/components/verify-lookup";

export const metadata = { title: "Verify a report" };

export default function VerifyLandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-4 py-12">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        null-portal
      </Link>
      <Card className="animate-page-in space-y-6 p-6 sm:p-8">
        <div className="space-y-3">
          <span className="bg-success/12 text-success flex h-12 w-12 items-center justify-center rounded-2xl">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">
            Verify a result report
          </h1>
          <p className="text-muted-foreground text-sm">
            Every published result PDF carries a QR code and a verification
            code. Enter the code to confirm the report is genuine and still
            current. Only the exam, score and masked initials are shown, never
            emails or answers.
          </p>
        </div>
        <VerifyLookup />
      </Card>
    </main>
  );
}
