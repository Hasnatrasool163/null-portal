"use client";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Download,
  FileText,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { ImportPreview } from "@/shared/schemas/question";

type Payload = { format: "csv" | "json"; content: string };

const kb = (n: number) =>
  n < 1024 ? `${n} B` : `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;

export function QuestionImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [dragging, setDragging] = useState(false);

  function reset() {
    setPayload(null);
    setPreview(null);
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
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
      toast.success(
        `Imported ${r.imported} question${r.imported === 1 ? "" : "s"}`,
      );
      qc.invalidateQueries({ queryKey: ["questions"] });
      qc.invalidateQueries({ queryKey: ["topics"] });
      reset();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  async function onFile(f: File | undefined) {
    if (!f) return;
    const lower = f.name.toLowerCase();
    if (!lower.endsWith(".csv") && !lower.endsWith(".json")) {
      toast.error("Choose a .csv or .json file.");
      return;
    }
    const p = {
      format: lower.endsWith(".json") ? "json" : "csv",
      content: await f.text(),
    } as Payload;
    setPayload(p);
    setFile({ name: f.name, size: f.size });
    setPreview(null);
    validate.mutate(p);
  }

  const skipped = preview ? preview.total - preview.valid : 0;

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
            onChange={(e) => onFile(e.target.files?.[0])}
          />

          {!file ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                void onFile(e.dataTransfer.files?.[0]);
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
          ) : (
            <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
              <span className="bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
                <FileText className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-muted-foreground text-xs">
                  {kb(file.size)}
                  {validate.isPending && " · Checking rows…"}
                  {preview &&
                    ` · ${preview.total} row${preview.total === 1 ? "" : "s"}`}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
              >
                Replace
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Remove file"
                onClick={reset}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {!file && (
            <div className="bg-muted/40 space-y-2 rounded-lg px-4 py-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-foreground font-medium">File format</span>
                <span className="flex gap-1">
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                  >
                    <a href="/samples/questions-sample.csv" download>
                      <Download className="h-3.5 w-3.5" />
                      Sample CSV
                    </a>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                  >
                    <a href="/samples/questions-sample.json" download>
                      <Download className="h-3.5 w-3.5" />
                      Sample JSON
                    </a>
                  </Button>
                </span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Columns:{" "}
                <code className="text-foreground">
                  topic, difficulty, type, body, marks, options, correct
                </code>
                . Separate options with{" "}
                <code className="text-foreground">|</code> and correct option
                numbers with <code className="text-foreground">;</code>. Topics
                that don&apos;t exist yet are created.
              </p>
            </div>
          )}

          {preview && (
            <>
              <div className="grid grid-cols-2 gap-3" role="status">
                <div className="rounded-lg border px-4 py-3">
                  <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <CheckCircle2
                      className="text-success h-3.5 w-3.5"
                      aria-hidden="true"
                    />{" "}
                    Ready to import
                  </p>
                  <p className="mt-0.5 text-xl font-semibold tabular-nums">
                    {preview.valid}
                  </p>
                </div>
                <div className="rounded-lg border px-4 py-3">
                  <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <XCircle
                      className={cn(
                        "h-3.5 w-3.5",
                        skipped ? "text-destructive" : "",
                      )}
                      aria-hidden="true"
                    />{" "}
                    Will be skipped
                  </p>
                  <p className="mt-0.5 text-xl font-semibold tabular-nums">
                    {skipped}
                  </p>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto rounded-md border">
                <Table>
                  <THead>
                    <TR>
                      <TH className="w-14">Row</TH>
                      <TH>Question</TH>
                      <TH className="w-48">Result</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {preview.rows.map((r) => (
                      <TR key={r.row}>
                        <TD className="text-muted-foreground tabular-nums">
                          {r.row}
                        </TD>
                        <TD className="max-w-xs truncate">{r.summary}</TD>
                        <TD>
                          {r.ok ? (
                            <span className="text-success inline-flex items-center gap-1 text-xs font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Valid
                            </span>
                          ) : (
                            <ul className="text-destructive space-y-0.5 text-xs">
                              {r.errors.map((e, i) => (
                                <li key={i}>
                                  <span className="font-medium">{e.field}</span>
                                  : {e.message}
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
              {commit.isPending ? (
                <Spinner />
              ) : validate.isPending ? (
                <Spinner />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {preview?.valid
                ? `Import ${preview.valid} question${preview.valid === 1 ? "" : "s"}`
                : "Import questions"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
