import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { readSession } from "./session";
import { userRepo } from "../repositories/user.repo";
import type { Role, SessionUser } from "@/shared/schemas/auth";

/** Who is logged in? Always re-read from DB and verify session_version so logout/deactivation revoke immediately. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const sess = await readSession();
  return sess ? userRepo.findById(sess.userId, sess.sessionVersion) : null;
});

/** Page-level guard: not logged in -> /login, wrong role -> 404 (the page "does not exist" for them). */
export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) notFound();
  return user;
}
