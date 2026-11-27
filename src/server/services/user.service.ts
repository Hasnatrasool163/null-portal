import "server-only";
import { userRepo } from "../repositories/user.repo";
import { hashPassword } from "../auth/password";
import { generateTempPassword } from "../auth/temp-password";
import { Errors } from "../http";
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

  async create(input: CreateUserInput) {
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
    // The temporary password is returned exactly once and is never stored in clear text.
    return { user, tempPassword };
  },

  async update(actor: SessionUser, id: string, patch: UpdateUserInput) {
    const target = await userRepo.findAnyById(id);
    if (!target) throw Errors.notFound("User not found");

    const demoting = patch.role !== undefined && patch.role !== "ADMIN";
    const deactivating = patch.isActive === false;
    if (target.id === actor.id && (demoting || deactivating)) {
      throw Errors.conflict(
        "You cannot demote or deactivate your own account",
      );
    }
    if (
      target.role === "ADMIN" &&
      target.isActive &&
      (demoting || deactivating) &&
      (await userRepo.countOtherActiveAdmins(target.id)) === 0
    ) {
      throw Errors.conflict(
        "At least one active administrator must remain",
      );
    }
    return (await userRepo.update(id, patch))!;
  },
};
