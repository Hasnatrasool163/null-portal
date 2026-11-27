import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/shared/schemas/auth";

const COOKIE = "sid";
const MAX_AGE = 60 * 60 * 8; // 8 hours

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production")
      throw new Error("SESSION_SECRET must be set (32+ chars)");
    return new TextEncoder().encode(
      "dev-only-secret-change-me-dev-only-secret",
    );
  }
  return new TextEncoder().encode(s);
}

export async function createSession(
  userId: string,
  role: Role,
  sessionVersion: number,
) {
  const token = await new SignJWT({ role, sv: sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

/**
 * Returns the user id and session version from a valid signed cookie, else null.
 * Role is NEVER trusted from the cookie; sessionVersion is checked against users.session_version in DB.
 */
export async function readSession(): Promise<{
  userId: string;
  sessionVersion: number;
} | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.sub !== "string" || typeof payload.sv !== "number") {
      return null;
    }
    return { userId: payload.sub, sessionVersion: payload.sv };
  } catch {
    return null;
  }
}
