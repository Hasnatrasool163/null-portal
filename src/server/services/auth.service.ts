import "server-only";
import { userRepo } from "../repositories/user.repo";
import { hashPassword, verifyPassword } from "../auth/password";
import { createSession, destroySession, readSession } from "../auth/session";
import { checkRateLimit, Errors } from "../http";
import type { LoginInput, RegisterInput } from "@/shared/schemas/auth";

export const authService = {
  /** Public registration always creates a CANDIDATE (privileged roles are admin-created). */
  async register(input: RegisterInput) {
    if (await userRepo.findWithHashByEmail(input.email)) {
      throw Errors.conflict("This email is already registered", {
        email: "Email already in use",
      });
    }
    const user = await userRepo.create({
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: "CANDIDATE",
    });
    await createSession(user.id, user.role, 1);
    return user;
  },

  async login(input: LoginInput) {
    // Per-account DB-backed throttling (prevents credential stuffing even across rotated IPs/headers).
    await checkRateLimit(`login:email:${input.email.toLowerCase()}`, 10, 60_000);

    const found = await userRepo.findWithHashByEmail(input.email);
    // Same message for "no such user" and "wrong password" (no account enumeration).
    if (!found || !(await verifyPassword(input.password, found.passwordHash))) {
      throw Errors.unauthorized("Invalid email or password");
    }
    if (!found.isActive) {
      throw Errors.forbidden(
        "This account has been deactivated. Contact an administrator.",
      );
    }
    await createSession(found.user.id, found.user.role, found.sessionVersion);
    return found.user;
  },

  /** Revokes the user's session server-side (bumps session_version) and clears the cookie. */
  async logout() {
    const sess = await readSession();
    if (sess) {
      await userRepo.bumpSessionVersion(sess.userId);
    }
    await destroySession();
  },
};
