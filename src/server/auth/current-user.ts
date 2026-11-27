import "server-only";
import { cache } from "react";
import { readSessionUserId } from "./session";
import { userRepo } from "../repositories/user.repo";
import type { SessionUser } from "@/shared/schemas/auth";

/** Who is logged in? Always re-read from the DB so role/name are never client-controlled. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const id = await readSessionUserId();
  return id ? userRepo.findById(id) : null;
});
