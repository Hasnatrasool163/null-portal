import { CheckCircle2, XCircle } from "lucide-react";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ImportPreview } from "@/shared/schemas/question";

/** Validation result: valid/skipped counts and the per-row outcome. */
export function ImportPreviewTable({ preview }: { preview: ImportPreview }) {
  const skipped = preview.total - preview.valid;
  return (
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
              className={cn("h-3.5 w-3.5", skipped ? "text-destructive" : "")}
              aria-hidden="true"
            />{" "}
            Will be skipped
          </p>
          <p className="mt-0.5 text-xl font-semibold tabular-nums">{skipped}</p>
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
                <TD className="text-muted-foreground tabular-nums">{r.row}</TD>
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
                          <span className="font-medium">{e.field}</span>:{" "}
                          {e.message}
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
  );
}
