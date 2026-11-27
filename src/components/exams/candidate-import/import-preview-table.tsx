import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { CandidateImportPreview } from "@/shared/schemas/exam";

/** Per-row validation outcome of an uploaded candidate CSV. */
export function ImportPreviewTable({
  preview,
}: {
  preview: CandidateImportPreview;
}) {
  return (
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
                        {r.kind === "NEW" ? "New account" : "Existing"}
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
  );
}
