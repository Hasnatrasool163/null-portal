import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/shared/schemas/auth";

const COOKIE = "sid";
const MAX_AGE = 60 * 60 * 8; // 8 hours

/**
 * One active session per account. A session that has not been seen (request or client
 * heartbeat) for this long is treated as abandoned (closed browser, dead device) and a
 * new login may replace it. The client heartbeat runs well inside this window.
 */
export const SESSION_IDLE_SECONDS = 120;

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
  sessionId: string,
) {
  const token = await new SignJWT({ role, sv: sessionVersion, sid: sessionId })
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
 * Returns the user id, session version and session id from a valid signed cookie, else null.
 * Role is NEVER trusted from the cookie; sessionVersion and sessionId are checked against the DB.
 */
export async function readSession(): Promise<{
  userId: string;
  sessionVersion: number;
  sessionId: string;
} | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (
      typeof payload.sub !== "string" ||
      typeof payload.sv !== "number" ||
      typeof payload.sid !== "string"
    ) {
      return null;
    }
    return {
      userId: payload.sub,
      sessionVersion: payload.sv,
      sessionId: payload.sid,
    };
  } catch {
    return null;
  }
}
