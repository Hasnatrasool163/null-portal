"use client";
import type { ReactNode } from "react";
import {
  HelpCircle,
  LayoutGrid,
  Maximize2,
  Minimize2,
  NotebookPen,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import type { WorkspacePreferences } from "@/shared/schemas/secondary";

/**
 * Top exam bar: title + position on the left; the status chips passed as
 * `status` plus the workspace tool buttons on the right.
 */
export function WorkspaceToolbar({
  examTitle,
  index,
  total,
  status,
  scratchpadOpen,
  onToggleScratchpad,
  fullscreen,
  onToggleFullscreen,
  onOpenPreferences,
  palettePosition,
  onOpenPalette,
  onOpenHelp,
}: {
  examTitle: string;
  index: number;
  total: number;
  status: ReactNode;
  scratchpadOpen: boolean;
  onToggleScratchpad: () => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenPreferences: () => void;
  palettePosition: WorkspacePreferences["palettePosition"];
  onOpenPalette: () => void;
  onOpenHelp: () => void;
}) {
  return (
    <div className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold">{examTitle}</h1>
        <p className="text-muted-foreground text-xs">
          Question {index + 1} of {total}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {status}

        <Tooltip
          content={
            <>
              Scratchpad <span className="opacity-60">· S</span>
            </>
          }
          side="bottom"
        >
          <Button
            size="sm"
            variant="outline"
            aria-pressed={scratchpadOpen}
            onClick={onToggleScratchpad}
          >
            <NotebookPen className="h-4 w-4" />
            <span className="hidden sm:inline">Scratchpad</span>
          </Button>
        </Tooltip>

        <Tooltip
          content={fullscreen ? "Exit full screen" : "Full screen"}
          side="bottom"
        >
          <Button
            size="icon"
            tooltip={false}
            variant="ghost"
            aria-label={fullscreen ? "Exit full screen" : "Enter full screen"}
            onClick={onToggleFullscreen}
          >
            {fullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </Tooltip>

        <Tooltip content="Workspace settings" side="bottom">
          <Button
            size="icon"
            tooltip={false}
            variant="ghost"
            aria-label="Workspace settings"
            onClick={onOpenPreferences}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </Tooltip>

        <Tooltip content="Question navigator" side="bottom">
          <Button
            size="icon"
            tooltip={false}
            variant="outline"
            className={palettePosition === "side" ? "lg:hidden" : "hidden"}
            aria-label="Open question palette"
            onClick={onOpenPalette}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </Tooltip>

        <Tooltip
          content={
            <>
              Keyboard shortcuts <span className="opacity-60">· ?</span>
            </>
          }
          side="bottom"
          align="end"
        >
          <Button
            size="icon"
            tooltip={false}
            variant="ghost"
            aria-label="Keyboard shortcuts"
            onClick={onOpenHelp}
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
