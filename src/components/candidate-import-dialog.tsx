"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, FileUp, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge, Spinner } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api-client";
import type {
  CandidateImportPreview,
  CandidateImportResult,
} from "@/shared/schemas/exam";

function downloadCredentialsCsv(
  rows: { name: string; email: string; tempPassword: string }[],
) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const csv = [
    "name,email,temporary_password",
    ...rows.map((r) => `${esc(r.name)},${esc(r.email)},${esc(r.tempPassword)}`),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "candidate-credentials.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function CandidateImportDialog({
  examId,
  open,
  onOpenChange,
}: {
  examId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [content, setContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<CandidateImportPreview | null>(null);
  const [result, setResult] = useState<CandidateImportResult | null>(null);

  function reset() {
    setContent(null);
    setFileName("");
    setPreview(null);
    setResult(null);
  }

  const validate = useMutation({
    mutationFn: (c: string) =>
      api<CandidateImportPreview>(
        `/api/exams/${examId}/candidates/import/validate`,
        { method: "POST", body: { content: c } },
      ),
    onSuccess: setPreview,
    onError: (e) => {
      setPreview(null);
      toast.error(e.message);
    },
  });

  const commit = useMutation({
    mutationFn: (c: string) =>
      api<CandidateImportResult>(
        `/api/exams/${examId}/candidates/import/commit`,
        { method: "POST", body: { content: c } },
      ),
    onSuccess: (r) => {
      toast.success(`Enrolled ${r.enrolled} candidate(s)`);
      qc.invalidateQueries({ queryKey: ["exam-enrollments", examId] });
      qc.invalidateQueries({ queryKey: ["exam", examId] });
      qc.invalidateQueries({ queryKey: ["exams"] });
      if (r.created.length > 0) {
        setResult(r);
      } else {
        reset();
        onOpenChange(false);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  async function onFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    setContent(text);
    setFileName(file.name);
    setPreview(null);
    setResult(null);
    validate.mutate(text);
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
        title={result ? "Temporary passwords generated" : "Import candidates"}
        description={
          result
            ? "Save or download these temporary passwords now. They are shown once and no email is sent."
            : "Upload a CSV (name,email). New candidate accounts get a one-time temporary password."
        }
      >
        {result ? (
          <div className="space-y-4">
            <p className="text-sm">
              Enrolled <b>{result.enrolled}</b> candidate(s)
              {result.alreadyEnrolled > 0 &&
                ` (${result.alreadyEnrolled} already enrolled)`}
              . Created <b>{result.created.length}</b> new account(s):
            </p>
            <div className="max-h-72 overflow-y-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Name</TH>
                    <TH>Email</TH>
                    <TH>Temporary password</TH>
                  </TR>
                </THead>
                <TBody>
                  {result.created.map((c) => (
                    <TR key={c.email}>
                      <TD>{c.name}</TD>
                      <TD>{c.email}</TD>
                      <TD>
                        <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                          {c.tempPassword}
                        </code>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
            <div className="flex justify-between gap-2">
              <Button
                variant="outline"
                onClick={() => downloadCredentialsCsv(result.created)}
              >
                <Download className="h-4 w-4" />
                Download CSV
              </Button>
              <Button
                onClick={() => {
                  reset();
                  onOpenChange(false);
                }}
              >
                Done
              </Button>
            </div>
          </div>
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
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
              </label>
              {fileName && <span className="text-sm">{fileName}</span>}
              <a
                className="text-muted-foreground ml-auto inline-flex items-center gap-1 text-sm underline"
                href="/samples/candidates-sample.csv"
                download
              >
                <Download className="h-3.5 w-3.5" />
                Sample CSV
              </a>
            </div>

            {validate.isPending && (
              <p className="flex items-center gap-2 text-sm">
                <Spinner /> Validating...
              </p>
            )}

            {preview && (
              <>
                <p className="text-sm" role="status">
                  <b>{preview.valid}</b> of {preview.total} rows valid (
                  {preview.newAccounts} new account(s),{" "}
                  {preview.valid - preview.newAccounts} existing).
                </p>
                <div className="max-h-72 overflow-y-auto">
                  <Table>
                    <THead>
                      <TR>
                        <TH>Row</TH>
                        <TH>Candidate</TH>
                        <TH>Result</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {preview.rows.map((r) => (
                        <TR key={r.row}>
                          <TD>{r.row}</TD>
                          <TD>
                            <p className="font-medium">{r.name || "—"}</p>
                            <p className="text-muted-foreground text-xs">
                              {r.email || "—"}
                            </p>
                          </TD>
                          <TD>
                            {r.ok ? (
                              <span className="inline-flex items-center gap-1.5">
                                <CheckCircle2 className="text-success h-4 w-4" />
                                <Badge>
                                  {r.kind === "NEW"
                                    ? "New account"
                                    : "Existing"}
                                </Badge>
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
                disabled={
                  !content || !preview || preview.valid === 0 || commit.isPending
                }
                onClick={() => content && commit.mutate(content)}
              >
                {commit.isPending && <Spinner />}
                Enroll {preview?.valid ?? 0} candidate(s)
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
