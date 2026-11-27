import "server-only";
import { userRepo } from "../repositories/user.repo";
import { hashPassword } from "../auth/password";
import { generateTempPassword } from "../auth/temp-password";
import { Errors, assertUuid } from "../http";
import { audit } from "../audit";
import type { SessionUser } from "@/shared/schemas/auth";
import type {
  CreateUserInput,
  UpdateUserInput,
  UserListQuery,
} from "@/shared/schemas/user";

/** Administrator-only user management. Routes restrict to ADMIN; rules live here. */
export const userService = {
  async list(q: UserListQuery) {
    const { users, total } = await userRepo.list(q);
    return { users, total, page: q.page, pageSize: q.pageSize };
  },

  stats: () => userRepo.stats(),

  async create(input: CreateUserInput, actor?: SessionUser) {
    if (await userRepo.findWithHashByEmail(input.email)) {
      throw Errors.conflict("This email is already registered", {
        email: "Email already in use",
      });
    }
    const tempPassword = generateTempPassword();
    const user = await userRepo.create({
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(tempPassword),
      role: input.role,
    });
    if (actor) {
      await audit(null, actor, {
        action: "USER_CREATED",
        targetType: "user",
        targetId: user.id,
        summary: `Created ${user.role.toLowerCase()} account for ${user.name} (${user.email})`,
        details: { role: user.role, email: user.email },
      });
    }
    // The temporary password is returned exactly once and is never stored in clear text.
    return { user, tempPassword };
  },

  async update(actor: SessionUser, id: string, patch: UpdateUserInput) {
    const target = await userRepo.findAnyById(id);
    if (!target) throw Errors.notFound("User not found");

    const demoting = patch.role !== undefined && patch.role !== "ADMIN";
    const deactivating = patch.isActive === false;
    if (target.id === actor.id && (demoting || deactivating)) {
      throw Errors.conflict("You cannot demote or deactivate your own account");
    }
    if (
      target.role === "ADMIN" &&
      target.isActive &&
      (demoting || deactivating) &&
      (await userRepo.countOtherActiveAdmins(target.id)) === 0
    ) {
      throw Errors.conflict("At least one active administrator must remain");
    }
    const updated = (await userRepo.update(id, patch))!;
    if (patch.role !== undefined && patch.role !== target.role) {
      await audit(null, actor, {
        action: "ROLE_CHANGED",
        targetType: "user",
        targetId: target.id,
        summary: `Changed ${target.name}'s role: ${target.role} → ${patch.role}`,
        details: { from: target.role, to: patch.role, email: target.email },
      });
    }
    if (patch.isActive !== undefined && patch.isActive !== target.isActive) {
      await audit(null, actor, {
        action: patch.isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
        targetType: "user",
        targetId: target.id,
        summary: `${patch.isActive ? "Reactivated" : "Deactivated"} ${target.name} (${target.email})`,
        details: { email: target.email },
      });
    }
    return updated;
  },

  /**
   * Admin-initiated password reset for any user (all roles).
   * Generates a one-time temporary password (returned once, never stored or logged),
   * revokes all active sessions of the target user, and writes an audit entry.
   */
  async resetPassword(actor: SessionUser, id: string) {
    if (actor.role !== "ADMIN") throw Errors.forbidden();
    const targetId = assertUuid(id, "User");
    const target = await userRepo.findAnyById(targetId);
    if (!target) throw Errors.notFound("User not found");

    if (target.id === actor.id) {
      throw Errors.conflict(
        "Use change-password to update your own password.",
      );
    }

    const tempPassword = generateTempPassword();
    const hash = await hashPassword(tempPassword);
    const nextVersion = await userRepo.updatePasswordAndBumpSession(
      target.id,
      hash,
    );
    if (nextVersion === null) throw Errors.notFound("User not found");

    await audit(null, actor, {
      action: "PASSWORD_RESET",
      targetType: "user",
      targetId: target.id,
      summary: `Reset password for ${target.name} (${target.email})`,
      details: { email: target.email, role: target.role },
    });

    // Returned once over HTTPS/JSON with Cache-Control: no-store; never stored in clear text.
    return { user: target, tempPassword };
  },
};
