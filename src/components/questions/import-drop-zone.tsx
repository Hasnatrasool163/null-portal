"use client";
import { useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

/** Empty state of the import dialog: click to browse, or drag a file onto it. */
export function ImportDropZone({
  onBrowse,
  onDropFile,
}: {
  onBrowse: () => void;
  onDropFile: (f: File | undefined) => void;
}) {
  const [dragging, setDragging] = useState(false);
  return (
    <button
      type="button"
      onClick={onBrowse}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        onDropFile(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        "focus-visible:ring-ring flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors focus-visible:ring-2 focus-visible:outline-none",
        dragging
          ? "border-primary bg-accent/60"
          : "hover:border-primary/50 hover:bg-muted/40",
      )}
    >
      <span className="bg-accent text-accent-foreground flex h-10 w-10 items-center justify-center rounded-lg">
        <Upload className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="text-sm font-medium">
        Drop a file here or <span className="text-primary">browse</span>
      </span>
      <span className="text-muted-foreground text-xs">
        CSV or JSON, up to 500 KB
      </span>
    </button>
  );
}
