import { publicRoute } from "@/server/http";
import { secondaryService } from "@/server/services/secondary.service";

export const GET = publicRoute({}, async ({ params }) =>
  secondaryService.verifyReportCode(params.code),
);
