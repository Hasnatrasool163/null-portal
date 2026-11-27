import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { query } from "./db";
import { getCurrentUser } from "./auth/current-user";
import type { Role, SessionUser } from "@/shared/schemas/auth";

/** Every API error looks the same: { ok:false, error:{ code, message, fields? } } */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}
export const Errors = {
  badRequest: (m = "Invalid request", fields?: Record<string, string>) =>
    new ApiError(400, "BAD_REQUEST", m, fields),
  unauthorized: (m = "Please log in") => new ApiError(401, "UNAUTHORIZED", m),
  forbidden: (m = "You do not have access") =>
    new ApiError(403, "FORBIDDEN", m),
  notFound: (m = "Not found") => new ApiError(404, "NOT_FOUND", m),
  conflict: (m: string, fields?: Record<string, string>) =>
    new ApiError(409, "CONFLICT", m, fields),
  tooMany: () =>
    new ApiError(429, "RATE_LIMITED", "Too many requests, slow down"),
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Malformed ids are "not found" (and never reach SQL). */
export function assertUuid(id: string | undefined, what = "Record"): string {
  if (!id || !UUID_RE.test(id)) throw Errors.notFound(`${what} not found`);
  return id;
}

function zodFields(e: ZodError) {
  const fields: Record<string, string> = {};
  for (const i of e.issues) fields[i.path.join(".") || "_"] ??= i.message;
  return fields;
}

/**
 * Resolve client IP safely: only trust proxy headers when running behind a known trusted proxy
 * (Vercel or TRUST_PROXY=true). Otherwise use "direct" so client-spoofed X-Forwarded-For headers
 * cannot bypass rate limits.
 */
function resolveClientKey(req: Request): string {
  const behindTrustedProxy =
    process.env.VERCEL === "1" || process.env.TRUST_PROXY === "true";
  if (!behindTrustedProxy) return "direct";
  const vercelIp = req.headers.get("x-vercel-forwarded-for")?.split(",").pop()?.trim();
  if (vercelIp) return vercelIp;
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return "direct";
}

/** DB-backed sliding-window rate limiter (shared across server instances and restarts). */
export async function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
) {
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const [row] = await query<{ n: number }>(
    `WITH pruned AS (
       DELETE FROM rate_limit_hits
       WHERE key = $1 AND created_at < now() - ($2 || ' seconds')::interval
     ),
     ins AS (
       INSERT INTO rate_limit_hits (key) VALUES ($1) RETURNING 1
     )
     SELECT count(*)::int AS n
     FROM rate_limit_hits
     WHERE key = $1 AND created_at >= now() - ($2 || ' seconds')::interval`,
    [key, windowSec],
  );
  // Existing rows in window + the newly inserted row
  if ((row?.n ?? 0) + 1 > max) throw Errors.tooMany();
}

type Opts<B, Q> = {
  body?: ZodType<B>;
  query?: ZodType<Q>;
  rateLimit?: { max: number; windowMs: number };
};
type Ctx<B, Q, U> = {
  req: Request;
  user: U;
  body: B;
  query: Q;
  params: Record<string, string>;
};
type RouteCtx = { params: Promise<Record<string, string>> };

function build<B, Q, U extends SessionUser | null>(
  opts: Opts<B, Q>,
  roles: Role[] | "any" | null,
  handler: (c: Ctx<B, Q, U>) => Promise<unknown>,
) {
  return async (req: Request, routeCtx?: RouteCtx): Promise<Response> => {
    try {
      if (opts.rateLimit) {
        const ip = resolveClientKey(req);
        await checkRateLimit(
          `${ip}:${new URL(req.url).pathname}:${req.method}`,
          opts.rateLimit.max,
          opts.rateLimit.windowMs,
        );
      }
      let user: SessionUser | null = null;
      if (roles) {
        user = await getCurrentUser();
        if (!user) throw Errors.unauthorized();
        if (roles !== "any" && !roles.includes(user.role))
          throw Errors.forbidden();
      }
      let body = undefined as B;
      if (opts.body) {
        let raw: unknown;
        try {
          raw = await req.json();
        } catch {
          throw Errors.badRequest("Request body must be valid JSON");
        }
        body = opts.body.parse(raw);
      }
      const query = (
        opts.query
          ? opts.query.parse(Object.fromEntries(new URL(req.url).searchParams))
          : undefined
      ) as Q;
      const params = routeCtx ? await routeCtx.params : {};
      const out = await handler({ req, user: user as U, body, query, params });
      if (out instanceof Response) return out;
      return NextResponse.json({ ok: true, data: out ?? null });
    } catch (e) {
      if (e instanceof ZodError) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Please fix the highlighted fields",
              fields: zodFields(e),
            },
          },
          { status: 400 },
        );
      }
      if (e instanceof ApiError) {
        return NextResponse.json(
          {
            ok: false,
            error: { code: e.code, message: e.message, fields: e.fields },
          },
          { status: e.status },
        );
      }
      console.error("[api] unexpected error:", e);
      return NextResponse.json(
        {
          ok: false,
          error: { code: "INTERNAL", message: "Something went wrong" },
        },
        { status: 500 },
      );
    }
  };
}

/** No login needed (e.g. login, register, health). */
export const publicRoute = <B = undefined, Q = undefined>(
  opts: Opts<B, Q>,
  handler: (c: Ctx<B, Q, null>) => Promise<unknown>,
) => build<B, Q, null>(opts, null, handler);

/** Login required. Pass roles to restrict, e.g. authedRoute({}, handler, ["ADMIN"]). */
export const authedRoute = <B = undefined, Q = undefined>(
  opts: Opts<B, Q>,
  handler: (c: Ctx<B, Q, SessionUser>) => Promise<unknown>,
  roles: Role[] | "any" = "any",
) => build<B, Q, SessionUser>(opts, roles, handler);
