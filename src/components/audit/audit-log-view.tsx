"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/misc";
import { EmptyState } from "@/components/ui/blocks";
import { AuditLogTable } from "@/components/audit/audit-log-table";
import { auditApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_LABEL,
  type AuditAction,
} from "@/shared/schemas/audit";

const PAGE_SIZE = 25;

/** Append-only audit trail. `examId` scopes it to one exam; omit for the admin-wide log. */
export function AuditLogView({ examId }: { examId?: string }) {
  const [action, setAction] = useState<AuditAction | "">("");
  const [page, setPage] = useState(1);

  const list = useQuery({
    queryKey: qk.audit.list(examId, action, page),
    queryFn: () => auditApi.list({ examId, action, page, pageSize: PAGE_SIZE }),
  });

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
        <AuditLogTable items={list.data.items} showExam={!examId} />
      )}

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={list.data?.total ?? 0}
        onPage={setPage}
        noun="entries"
      />
    </div>
  );
}
