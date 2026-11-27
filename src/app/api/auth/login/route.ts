import { publicRoute } from "@/server/http";
import { loginSchema } from "@/shared/schemas/auth";
import { authService } from "@/server/services/auth.service";

export const POST = publicRoute(
  { body: loginSchema, rateLimit: { max: 10, windowMs: 60_000 } },
  async ({ body }) => authService.login(body),
);
