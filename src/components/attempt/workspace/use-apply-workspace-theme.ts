"use client";
import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import type { WorkspacePreferences } from "@/shared/schemas/secondary";

/**
 * Applies the workspace theme ONLY while the exam workspace is mounted, then
 * restores the user's normal app theme. Without this, the exam theme leaked
 * into every other page.
 */
export function useApplyWorkspaceTheme(theme: WorkspacePreferences["theme"]) {
  const { theme: appTheme, setTheme } = useTheme();
  // next-themes recreates setTheme whenever the theme changes, so keep the
  // latest one in a ref; otherwise the effects below would re-run in a loop.
  const setThemeRef = useRef(setTheme);
  const original = useRef<string | null>(null);

  useEffect(() => {
    setThemeRef.current = setTheme;
  }, [setTheme]);

  useEffect(() => {
    if (original.current === null) original.current = appTheme ?? "system";
    const root = document.documentElement;
    if (theme === "high-contrast") {
      root.classList.add("high-contrast");
      setThemeRef.current("light");
    } else {
      root.classList.remove("high-contrast");
      setThemeRef.current(theme);
    }
    // Only the workspace preference drives this; appTheme is read once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  useEffect(
    () => () => {
      document.documentElement.classList.remove("high-contrast");
      if (original.current) setThemeRef.current(original.current);
    },
    [],
  );
}
