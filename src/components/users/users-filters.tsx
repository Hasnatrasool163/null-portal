"use client";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { ROLES, ROLE_LABEL, type Role } from "@/shared/schemas/auth";

/** Search box and role filter above the user table. */
export function UsersFilters({
  search,
  onSearch,
  role,
  onRole,
}: {
  search: string;
  onSearch: (v: string) => void;
  role: Role | "";
  onRole: (v: Role | "") => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <SearchInput
        label="Search users"
        value={search}
        onChange={onSearch}
        phrases={["candidate3", "examiner1@demo.test", "Ada", "admin"]}
      />
      <Select
        className="w-48"
        aria-label="Filter by role"
        value={role}
        onChange={(e) => onRole(e.target.value as Role | "")}
      >
        <option value="">All roles</option>
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </Select>
    </div>
  );
}
