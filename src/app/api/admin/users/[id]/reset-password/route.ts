import { NextResponse } from "next/server";
import { authedRoute } from "@/server/http";
import { userService } from "@/server/services/user.service";

/** Admin-only password reset for any user; revokes active sessions and returns a one-time temp password. */
export const POST = authedRoute(
  { rateLimit: { max: 20, windowMs: 60_000 } },
  async ({ user, params }) => {
    const data = await userService.resetPassword(user, params.id);
    return NextResponse.json(
      { ok: true, data },
      { headers: { "Cache-Control": "no-store" } },
    );
  },
  ["ADMIN"],
);
