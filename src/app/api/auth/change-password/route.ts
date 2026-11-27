import { NextResponse } from "next/server";
import { authedRoute } from "@/server/http";
import { authService } from "@/server/services/auth.service";
import { changePasswordSchema } from "@/shared/schemas/auth";

/** Self-service password change for all authenticated roles (ADMIN, EXAMINER, CANDIDATE). */
export const POST = authedRoute(
  { body: changePasswordSchema, rateLimit: { max: 10, windowMs: 60_000 } },
  async ({ user, body }) => {
    const data = await authService.changePassword(user, body);
    return NextResponse.json(
      { ok: true, data },
      { headers: { "Cache-Control": "no-store" } },
    );
  },
  "any",
);
