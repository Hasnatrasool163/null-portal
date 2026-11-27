import "server-only";
import { userRepo } from "../repositories/user.repo";
import { hashPassword, verifyPassword } from "../auth/password";
import { randomUUID } from "node:crypto";
import {
  createSession,
  destroySession,
  readSession,
  SESSION_IDLE_SECONDS,
} from "../auth/session";
import { ApiError, checkRateLimit, Errors } from "../http";
import { audit } from "../audit";
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  SessionUser,
} from "@/shared/schemas/auth";

/** Distinct code so the login screen can explain it (not a generic conflict toast). */
const sessionActive = () =>
  new ApiError(
    409,
    "SESSION_ACTIVE",
    "This account is already signed in on another device, browser or tab. Sign out there first, or wait 2 minutes after closing it, then try again.",
  );

/** Claims the account's single session slot for a new cookie, or throws if another session is alive. */
async function startSession(userId: string, role: SessionUser["role"]) {
  const current = await readSession();
  const sessionId = randomUUID();
  const version = await userRepo.claimSession(
    userId,
    sessionId,
    current?.userId === userId ? current.sessionId : null,
    SESSION_IDLE_SECONDS,
  );
  if (version === null) throw sessionActive();
  await createSession(userId, role, version, sessionId);
}

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
    await startSession(user.id, user.role);
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
    // Checked only after the password, so this never leaks to someone without credentials.
    await startSession(found.user.id, found.user.role);
    return found.user;
  },

  /** Revokes the session server-side (bumps session_version, frees the slot) and clears the cookie. */
  async logout() {
    const sess = await readSession();
    if (sess) {
      await userRepo.releaseSession(
        sess.userId,
        sess.sessionVersion,
        sess.sessionId,
      );
    }
    await destroySession();
  },

  /**
   * Self-service password change for any authenticated role (ADMIN, EXAMINER, CANDIDATE).
   * Verifies current password, revokes all other sessions via session_version bump, and
   * re-issues a fresh session cookie for the caller.
   */
  async changePassword(user: SessionUser, input: ChangePasswordInput) {
    await checkRateLimit(`change-pw:${user.id}`, 10, 60_000);

    const found = await userRepo.findWithHashById(user.id);
    if (
      !found ||
      !(await verifyPassword(input.currentPassword, found.passwordHash))
    ) {
      throw Errors.unauthorized("Current password is incorrect");
    }

    const newHash = await hashPassword(input.newPassword);
    const nextVersion = await userRepo.updatePasswordAndBumpSession(
      user.id,
      newHash,
    );
    if (nextVersion === null) throw Errors.notFound("User not found");

    // The slot was just freed by the password change, so this always succeeds for the caller.
    await startSession(user.id, user.role);
    await audit(null, user, {
      action: "PASSWORD_CHANGED",
      targetType: "user",
      targetId: user.id,
      summary: `${user.name} changed their password`,
      details: { email: user.email, role: user.role },
    });
    return { changed: true };
  },
};
