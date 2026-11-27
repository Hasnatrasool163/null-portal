import { publicRoute } from "@/server/http";
import { registerSchema } from "@/shared/schemas/auth";
import { authService } from "@/server/services/auth.service";

export const POST = publicRoute(
  { body: registerSchema, rateLimit: { max: 10, windowMs: 60_000 } },
  async ({ body }) => authService.register(body),
);
