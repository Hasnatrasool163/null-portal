"use client";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Printable confirmation shown once the attempt is submitted (also what the back button lands on). */
export function SubmissionReceipt({
  examTitle,
  isSandbox,
  reason,
  receiptCode,
  submittedAt,
  answered,
  total,
  needsReview,
}: {
  examTitle: string;
  isSandbox: boolean;
  reason: string;
  receiptCode: string | null;
  submittedAt: string | null;
  answered: number;
  total: number;
  needsReview: boolean;
}) {
  const at = submittedAt ? new Date(submittedAt) : null;
  return (
    <Card className="mx-auto max-w-xl print:border-0 print:shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="text-success h-5 w-5" />
          Submission receipt
        </CardTitle>
        <p className="text-muted-foreground text-sm">{examTitle}</p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          {reason === "TIMEOUT"
            ? "Time ran out on the server, so your attempt was submitted automatically with every answer that had been saved."
            : "Your answers have been recorded. Results will appear on your home page once the examiner publishes them."}
          {isSandbox && " (Sandbox preview: not a real submission.)"}
        </p>
        <div className="rounded-md border-2 border-dashed p-4 text-center">
          <p className="text-muted-foreground text-xs">Confirmation code</p>
          <p
            className="font-mono text-2xl font-semibold tracking-widest"
            data-testid="receipt-code"
          >
            {receiptCode ?? "—"}
          </p>
        </div>
        <dl className="bg-muted grid grid-cols-2 gap-3 rounded-md p-3">
          <div>
            <dt className="text-muted-foreground text-xs">Submitted at</dt>
            <dd className="font-semibold">
              {/* Seconds matter on a receipt, so not the shared formatDateTime. */}
              {at
                ? at.toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "medium",
                  })
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">
              Questions answered
            </dt>
            <dd className="font-semibold">
              {answered} / {total}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">How</dt>
            <dd className="font-semibold">
              {reason === "TIMEOUT"
                ? "Auto-submitted at time limit"
                : "Submitted by you"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Status</dt>
            <dd className="font-semibold">
              {needsReview ? "Awaiting written grading" : "Auto-graded"}
            </dd>
          </div>
        </dl>
        <p className="text-muted-foreground text-xs">
          Keep this code. If there is ever a question about your submission, it
          identifies this exact attempt and time.
        </p>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button asChild>
            <Link href="/dashboard">Return to home</Link>
          </Button>
          {receiptCode && (
            <Button
              variant="outline"
              onClick={() => {
                void navigator.clipboard
                  ?.writeText(receiptCode)
                  .then(() => toast.success("Code copied"))
                  .catch(() => toast.error("Could not copy"));
              }}
            >
              Copy code
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            Print receipt
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
