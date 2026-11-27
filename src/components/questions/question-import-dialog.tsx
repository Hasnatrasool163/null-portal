"use client";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ImportDropZone } from "@/components/questions/import-drop-zone";
import { ImportFormatHelp } from "@/components/questions/import-format-help";
import { ImportPreviewTable } from "@/components/questions/import-preview-table";
import { ImportSelectedFile } from "@/components/questions/import-selected-file";
import { useQuestionImport } from "@/components/questions/use-question-import";
import { plural } from "@/lib/format";

export function QuestionImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const {
    inputRef,
    browse,
    payload,
    file,
    preview,
    validate,
    commit,
    selectFile,
    reset,
  } = useQuestionImport({ onImported: () => onOpenChange(false) });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent
        className="max-w-2xl"
        title="Import questions"
        description="Upload a CSV or JSON file. We check every row first, then import only the valid ones."
      >
        <div className="space-y-4">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.json,text/csv,application/json"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => selectFile(e.target.files?.[0])}
          />

          {!file ? (
            <ImportDropZone
              onBrowse={browse}
              onDropFile={(f) => void selectFile(f)}
            />
          ) : (
            <ImportSelectedFile
              file={file}
              checking={validate.isPending}
              preview={preview}
              onReplace={browse}
              onRemove={reset}
            />
          )}

          {!file && <ImportFormatHelp />}

          {preview && <ImportPreviewTable preview={preview} />}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                !payload || !preview || preview.valid === 0 || commit.isPending
              }
              onClick={() => payload && commit.mutate(payload)}
            >
              {commit.isPending || validate.isPending ? (
                <Spinner />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {preview?.valid
                ? `Import ${plural(preview.valid, "question")}`
                : "Import questions"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
