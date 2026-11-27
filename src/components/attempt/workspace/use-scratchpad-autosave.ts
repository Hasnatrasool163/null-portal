"use client";
import { useEffect, useRef, useState } from "react";
import { attemptsApi } from "@/lib/api";

export type ScratchpadSaveStatus = "saved" | "saving" | "unsaved";

const SAVE_DEBOUNCE_MS = 600;

/** Scratchpad notes text with debounced autosave to the attempt on the server. */
export function useScratchpadAutosave(attemptId: string, initialText: string) {
  const [text, setText] = useState(initialText);
  const [status, setStatus] = useState<ScratchpadSaveStatus>("saved");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function onTextChange(val: string) {
    setText(val);
    setStatus("unsaved");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setStatus("saving");
      try {
        await attemptsApi.saveScratchpad(attemptId, val);
        setStatus("saved");
      } catch {
        setStatus("unsaved");
      }
    }, SAVE_DEBOUNCE_MS);
  }

  return { text, status, onTextChange };
}
