"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge, Skeleton } from "@/components/ui/misc";
import { EmptyState } from "@/components/ui/blocks";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api-client";
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_LABEL,
  type AuditAction,
  type AuditList,
} from "@/shared/schemas/audit";

const PAGE_SIZE = 25;

function actionClass(a: AuditAction) {
  if (a === "GRADE_CHANGED" || a === "LATE_ANSWER_DISCARDED")
    return "bg-warning/15 text-warning";
  if (a === "ROLE_CHANGED" || a === "USER_DEACTIVATED" || a === "EXAM_CLOSED")
    return "bg-destructive/15 text-destructive";
  if (a === "RESULTS_PUBLISHED" || a === "EXAM_PUBLISHED")
    return "bg-success/15 text-success";
  return "";
}

/** Append-only audit trail. `examId` scopes it to one exam; omit for the admin-wide log. */
export function AuditLogView({ examId }: { examId?: string }) {
  const [action, setAction] = useState<AuditAction | "">("");
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
  });
  if (action) params.set("action", action);
  const base = examId ? `/api/exams/${examId}/audit` : "/api/admin/audit";

  const list = useQuery({
    queryKey: ["audit", examId ?? "all", action, page],
    queryFn: () => api<AuditList>(`${base}?${params}`),
  });
  const pages = Math.max(1, Math.ceil((list.data?.total ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Append-only record. Entries cannot be edited or deleted.
        </p>
        <Select
          aria-label="Filter by action"
          className="w-56"
          value={action}
          onChange={(e) => {
            setAction(e.target.value as AuditAction | "");
            setPage(1);
          }}
        >
          <option value="">All actions</option>
          {AUDIT_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {AUDIT_ACTION_LABEL[a]}
            </option>
          ))}
        </Select>
      </div>

      {list.isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : list.isError ? (
        <EmptyState
          title="Could not load the audit log"
          text={list.error.message}
          action={<Button onClick={() => list.refetch()}>Try again</Button>}
        />
      ) : list.data.items.length === 0 ? (
        <EmptyState
          title="No audit entries yet"
          text="Publishing, grade changes, extra time and role changes are recorded here."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>When</TH>
              <TH>Who</TH>
              <TH>Action</TH>
              <TH>Details</TH>
            </TR>
          </THead>
          <TBody>
            {list.data.items.map((e) => (
              <TR key={e.id}>
                <TD className="text-muted-foreground text-xs whitespace-nowrap">
                  {format(new Date(e.createdAt), "PP HH:mm:ss")}
                </TD>
                <TD>
                  <p className="font-medium">{e.actorName}</p>
                  <p className="text-muted-foreground text-xs">
                    {e.actorRole.charAt(0) + e.actorRole.slice(1).toLowerCase()}
                  </p>
                </TD>
                <TD>
                  <Badge className={actionClass(e.action)}>
                    {AUDIT_ACTION_LABEL[e.action] ?? e.action}
                  </Badge>
                </TD>
                <TD className="max-w-md text-sm">
                  <p className="break-words">{e.summary}</p>
                  {!examId && e.examId && (
                    <Link
                      href={`/exams/${e.examId}`}
                      className="text-muted-foreground text-xs underline-offset-2 hover:underline"
                    >
                      {e.examTitle ?? "Deleted exam"}
                    </Link>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page} of {pages} ({list.data?.total} entries)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
