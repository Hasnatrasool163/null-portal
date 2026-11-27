"use client";
import { useState } from "react";

// Collapsed state is a cookie (not localStorage) so the SERVER renders the sidebar
// in its saved state: no expand-then-collapse jump on page load.
// Read on the server in src/server/ui-prefs.ts; keep the cookie name in sync.
export const SIDEBAR_COOKIE = "np_sidebar";

export function useSidebarCollapse(initialCollapsed: boolean) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }

  return { collapsed, toggleCollapsed };
}
