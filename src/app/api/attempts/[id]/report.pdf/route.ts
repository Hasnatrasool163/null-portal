import { authedRoute } from "@/server/http";
import { secondaryService } from "@/server/services/secondary.service";

export const GET = authedRoute(
  {},
  async ({ req, user, params }) => {
    const origin = new URL(req.url).origin;
    const { buffer, filename, code } = await secondaryService.buildCandidatePdf(
      user,
      params.id,
      origin,
    );
    return new Response(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Verification-Code": code,
        "Cache-Control": "no-store",
      },
    });
  },
  ["CANDIDATE", "EXAMINER", "ADMIN"],
);
