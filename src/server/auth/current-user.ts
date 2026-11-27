import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { readSessionUserId } from "./session";
import { userRepo } from "../repositories/user.repo";
import type { Role, SessionUser } from "@/shared/schemas/auth";

/** Who is logged in? Always re-read from the DB so role/name/active are never client-controlled. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const id = await readSessionUserId();
  return id ? userRepo.findById(id) : null;
});

/** Page-level guard: not logged in -> /login, wrong role -> 404 (the page "does not exist" for them). */
export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) notFound();
  return user;
}
