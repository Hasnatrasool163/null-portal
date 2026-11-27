import { authedRoute } from "@/server/http";
import { secondaryService } from "@/server/services/secondary.service";

export const GET = authedRoute(
  {},
  async ({ user, params }) => {
    const { buffer, filename } = await secondaryService.buildExamSummaryPdf(
      user,
      params.id,
    );
    return new Response(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  },
  ["EXAMINER", "ADMIN"],
);
