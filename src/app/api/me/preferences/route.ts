import { authedRoute } from "@/server/http";
import { secondaryService } from "@/server/services/secondary.service";
import { preferencesPatchSchema } from "@/shared/schemas/secondary";

export const GET = authedRoute(
  {},
  async ({ user }) => secondaryService.getPreferences(user.id),
  "any",
);

export const PATCH = authedRoute(
  { body: preferencesPatchSchema },
  async ({ user, body }) => secondaryService.updatePreferences(user.id, body),
  "any",
);
