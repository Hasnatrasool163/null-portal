"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, FileUp, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api-client";
import type { ImportPreview } from "@/shared/schemas/question";

type Payload = { format: "csv" | "json"; content: string };

export function QuestionImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  function reset() {
    setPayload(null);
    setPreview(null);
    setFileName("");
  }

  const validate = useMutation({
    mutationFn: (p: Payload) =>
      api<ImportPreview>("/api/questions/import/validate", {
        method: "POST",
        body: p,
      }),
    onSuccess: setPreview,
    onError: (e) => {
      setPreview(null);
      toast.error(e.message);
    },
  });
  const commit = useMutation({
    mutationFn: (p: Payload) =>
      api<{ imported: number; skipped: number }>(
        "/api/questions/import/commit",
        { method: "POST", body: p },
      ),
    onSuccess: (r) => {
      toast.success(`Imported ${r.imported} question(s)`);
      qc.invalidateQueries({ queryKey: ["questions"] });
      qc.invalidateQueries({ queryKey: ["topics"] });
      reset();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  async function onFile(file: File | undefined) {
    if (!file) return;
    const format = file.name.toLowerCase().endsWith(".json") ? "json" : "csv";
    const p = { format, content: await file.text() } as Payload;
    setPayload(p);
    setFileName(file.name);
    setPreview(null);
    validate.mutate(p);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent
        className="max-w-3xl"
        title="Import questions"
        description="Upload a CSV or JSON file, review the validation preview, then import the valid rows."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="border-input hover:bg-accent focus-within:ring-ring inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border px-4 text-sm font-medium focus-within:ring-2">
              <FileUp className="h-4 w-4" />
              Choose file
              <input
                type="file"
                accept=".csv,.json,text/csv,application/json"
                className="sr-only"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </label>
            {fileName && <span className="text-sm">{fileName}</span>}
            <span className="text-muted-foreground ml-auto flex gap-3 text-sm">
              <a
                className="inline-flex items-center gap-1 underline"
                href="/samples/questions-sample.csv"
                download
              >
                <Download className="h-3.5 w-3.5" />
                Sample CSV
              </a>
              <a
                className="inline-flex items-center gap-1 underline"
                href="/samples/questions-sample.json"
                download
              >
                <Download className="h-3.5 w-3.5" />
                Sample JSON
              </a>
            </span>
          </div>
          <p className="text-muted-foreground text-xs">
            CSV columns: topic, difficulty, type, body, marks, options
            (separated by |), correct (option numbers separated by ;). Missing
            topics are created.
          </p>

          {validate.isPending && (
            <p className="flex items-center gap-2 text-sm">
              <Spinner /> Validating...
            </p>
          )}

          {preview && (
            <>
              <p className="text-sm" role="status">
                <span className="font-medium">{preview.valid}</span> of{" "}
                {preview.total} rows are valid
                {preview.valid < preview.total &&
                  `; ${preview.total - preview.valid} will be skipped.`}
              </p>
              <div className="max-h-72 overflow-y-auto">
                <Table>
                  <THead>
                    <TR>
                      <TH>Row</TH>
                      <TH>Question</TH>
                      <TH>Result</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {preview.rows.map((r) => (
                      <TR key={r.row}>
                        <TD>{r.row}</TD>
                        <TD className="max-w-xs truncate">{r.summary}</TD>
                        <TD>
                          {r.ok ? (
                            <span className="text-success inline-flex items-center gap-1">
                              <CheckCircle2 className="h-4 w-4" /> Valid
                            </span>
                          ) : (
                            <ul className="text-destructive space-y-0.5 text-xs">
                              {r.errors.map((e, i) => (
                                <li key={i} className="flex gap-1">
                                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                  <span>
                                    <b>{e.field}</b>: {e.message}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={!payload || !preview || preview.valid === 0 || commit.isPending}
              onClick={() => payload && commit.mutate(payload)}
            >
              {commit.isPending && <Spinner />}
              Import {preview?.valid ?? 0} valid row(s)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
