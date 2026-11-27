"use client";
import { Download, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ImportCredentialsResult } from "./candidate-import/import-credentials-result";
import { ImportPreviewTable } from "./candidate-import/import-preview-table";
import { useCandidateImport } from "./candidate-import/use-candidate-import";

/** Enroll candidates from a CSV, creating accounts (with temp passwords) for new emails. */
export function CandidateImportDialog({
  examId,
  open,
  onOpenChange,
}: {
  examId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const imp = useCandidateImport(examId, () => onOpenChange(false));
  const { preview, result, content } = imp;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) imp.reset();
        onOpenChange(o);
      }}
    >
      <DialogContent
        className="max-w-3xl"
        title={result ? "Temporary passwords generated" : "Import candidates"}
        description={
          result
            ? "Save or download these temporary passwords now. They are shown once and no email is sent."
            : "Upload a CSV (name,email). New candidate accounts get a one-time temporary password."
        }
      >
        {result ? (
          <ImportCredentialsResult
            result={result}
            onDone={() => {
              imp.reset();
              onOpenChange(false);
            }}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="border-input hover:bg-accent focus-within:ring-ring inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border px-4 text-sm font-medium focus-within:ring-2">
                <FileUp className="h-4 w-4" />
                Choose CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(e) => imp.selectFile(e.target.files?.[0])}
                />
              </label>
              {imp.fileName && <span className="text-sm">{imp.fileName}</span>}
              <a
                className="text-muted-foreground ml-auto inline-flex items-center gap-1 text-sm underline"
                href="/samples/candidates-sample.csv"
                download
              >
                <Download className="h-3.5 w-3.5" />
                Sample CSV
              </a>
            </div>

            {imp.validating && (
              <p className="flex items-center gap-2 text-sm">
                <Spinner /> Validating...
              </p>
            )}

            {preview && <ImportPreviewTable preview={preview} />}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                disabled={
                  !content ||
                  !preview ||
                  preview.valid === 0 ||
                  imp.commit.isPending
                }
                onClick={() => content && imp.commit.mutate(content)}
              >
                {imp.commit.isPending && <Spinner />}
                Enroll {preview?.valid ?? 0} candidate(s)
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
