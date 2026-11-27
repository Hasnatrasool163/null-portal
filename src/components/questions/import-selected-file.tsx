"use client";
import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFileSize, plural } from "@/lib/format";
import type { ImportPreview } from "@/shared/schemas/question";

/** The chosen file, its validation progress, and Replace / Remove actions. */
export function ImportSelectedFile({
  file,
  checking,
  preview,
  onReplace,
  onRemove,
}: {
  file: { name: string; size: number };
  checking: boolean;
  preview: ImportPreview | null;
  onReplace: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
      <span className="bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
        <FileText className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.name}</p>
        <p className="text-muted-foreground text-xs">
          {formatFileSize(file.size)}
          {checking && " · Checking rows…"}
          {preview && ` · ${plural(preview.total, "row")}`}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onReplace}>
        Replace
      </Button>
      <Button
        size="icon"
        variant="ghost"
        aria-label="Remove file"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
