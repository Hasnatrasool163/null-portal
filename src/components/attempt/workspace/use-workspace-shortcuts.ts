"use client";
import { useEffect, type Dispatch, type SetStateAction } from "react";
import type {
  AttemptQuestionPublic,
  AttemptStatus,
} from "@/shared/schemas/attempt";
import { toggleFlag, toggleOption, type UpdateDraft } from "./draft-answer";

/**
 * Keyboard shortcuts: Left/Right navigate, 1-9 select option, F flag, S
 * scratchpad, ? help. Paused while typing in a textarea/input/select.
 * `setScratchpadOpen`/`setHelpOpen` must be stable state setters.
 */
export function useWorkspaceShortcuts({
  status,
  currentQuestion,
  index,
  reviewMode,
  confirmSubmit,
  updateDraft,
  jumpTo,
  setScratchpadOpen,
  setHelpOpen,
}: {
  status: AttemptStatus;
  currentQuestion: AttemptQuestionPublic | undefined;
  index: number;
  reviewMode: boolean;
  confirmSubmit: boolean;
  updateDraft: UpdateDraft;
  jumpTo: (i: number) => void;
  setScratchpadOpen: Dispatch<SetStateAction<boolean>>;
  setHelpOpen: Dispatch<SetStateAction<boolean>>;
}) {
  useEffect(() => {
    if (status !== "IN_PROGRESS" || reviewMode || confirmSubmit) return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;
      if (!currentQuestion) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        jumpTo(index + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        jumpTo(index - 1);
      } else if ((e.key === "s" || e.key === "S") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setScratchpadOpen((o) => !o);
      } else if (e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        updateDraft(currentQuestion.id, toggleFlag);
      } else if (currentQuestion.type !== "WRITTEN" && /^[1-9]$/.test(e.key)) {
        const opt = currentQuestion.options[Number(e.key) - 1];
        if (!opt) return;
        e.preventDefault();
        updateDraft(
          currentQuestion.id,
          toggleOption(currentQuestion.type, opt.id),
        );
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    status,
    currentQuestion,
    reviewMode,
    confirmSubmit,
    updateDraft,
    jumpTo,
    index,
    setScratchpadOpen,
    setHelpOpen,
  ]);
}
