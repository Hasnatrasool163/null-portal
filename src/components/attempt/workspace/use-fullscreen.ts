"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/** Tracks and toggles document full screen. */
export function useFullscreen() {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
    else
      void document.documentElement
        .requestFullscreen()
        .catch(() =>
          toast.error("Full screen is not available in this browser."),
        );
  }

  return { fullscreen, toggleFullscreen };
}
