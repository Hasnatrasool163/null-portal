"use client";
import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { usersApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { Role } from "@/shared/schemas/auth";

export const USERS_PAGE_SIZE = 10;

/** Search + role filter + paging for the admin user list. Changing a filter returns to page 1. */
export function useUserList() {
  const [search, setSearch] = useState("");
  const [q] = useDebounce(search, 300);
  const [role, setRole] = useState<Role | "">("");
  const [page, setPage] = useState(1);

  const list = useQuery({
    queryKey: qk.users.list(q, role, page),
    queryFn: () => usersApi.list({ q, role, page, pageSize: USERS_PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  return {
    list,
    search,
    setSearch: (v: string) => {
      setSearch(v);
      setPage(1);
    },
    role,
    setRole: (v: Role | "") => {
      setRole(v);
      setPage(1);
    },
    page,
    setPage,
  };
}
