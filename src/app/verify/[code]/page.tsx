import { secondaryService } from "@/server/services/secondary.service";
import { VerifyFrame } from "@/components/verify/verify-frame";
import { VerifyReportCard } from "@/components/verify/verify-report-card";
import { VerifyPrivacyNote } from "@/components/verify/verify-privacy-note";
import { BackButton } from "@/components/ui/back-button";
import type { VerificationPublic } from "@/shared/schemas/secondary";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verify a report" };

export default async function VerifyReportPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  let data: VerificationPublic | null = null;
  try {
    data = await secondaryService.verifyReportCode(code);
  } catch {
    // Unknown code (or lookup failure): the card shows "Code not found".
    data = null;
  }

  return (
    <VerifyFrame>
      <div className="flex justify-center pt-2 sm:pt-6">
        <div className="animate-page-in w-full max-w-lg space-y-3">
          <BackButton href="/verify" label="Verify another code" />
          <VerifyReportCard code={code} data={data} />
          <VerifyPrivacyNote />
        </div>
      </div>
    </VerifyFrame>
  );
}
