import "server-only";
import { cookies } from "next/headers";

/** Sidebar collapsed state, saved by the client in a cookie so the server can render it. */
export async function getSidebarCollapsed() {
  return (await cookies()).get("np_sidebar")?.value === "1";
}
