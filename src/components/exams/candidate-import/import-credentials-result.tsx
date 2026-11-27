"use client";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { CandidateImportResult } from "@/shared/schemas/exam";
import { downloadCredentialsCsv } from "./download-credentials-csv";

/** After commit: the newly created accounts and their one-time passwords. */
export function ImportCredentialsResult({
  result,
  onDone,
}: {
  result: CandidateImportResult;
  onDone: () => void;
}) {
  return (
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
        <Button onClick={onDone}>Done</Button>
      </div>
    </div>
  );
}
