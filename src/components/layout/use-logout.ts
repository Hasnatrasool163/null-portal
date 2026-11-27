"use client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authApi } from "@/lib/api";

/** Ends the session server-side, then sends the user to the sign-in page. */
export function useLogout() {
  const router = useRouter();
  return async function logout() {
    try {
      await authApi.logout();
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Could not log out");
    }
  };
}
