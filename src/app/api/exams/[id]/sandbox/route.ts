import { authedRoute } from "@/server/http";
import { secondaryService } from "@/server/services/secondary.service";
import { sandboxStartSchema } from "@/shared/schemas/secondary";

export const POST = authedRoute(
  { body: sandboxStartSchema },
  async ({ user, body, params }) =>
    secondaryService.startSandbox(user, params.id, body.reset ?? false),
  ["EXAMINER"],
);
