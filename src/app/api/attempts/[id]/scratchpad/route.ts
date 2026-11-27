import { authedRoute } from "@/server/http";
import { secondaryService } from "@/server/services/secondary.service";
import { scratchpadSchema } from "@/shared/schemas/secondary";

export const PUT = authedRoute(
  { body: scratchpadSchema },
  async ({ user, body, params }) =>
    secondaryService.saveScratchpad(user, params.id, body.scratchpad),
  ["CANDIDATE", "EXAMINER"],
);
