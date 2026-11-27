"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination, usePaged } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/misc";
import { EmptyState } from "@/components/ui/blocks";
import { CandidateImportDialog } from "@/components/exams/candidate-import-dialog";
import { examsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { EnrollCandidatesDialog } from "./enroll-candidates-dialog";
import { EnrolledCandidatesTable } from "./enrolled-candidates-table";
import { useRemoveEnrollment } from "./use-enrollment-mutations";

/** "Enrollments" tab: the exam roster plus add / import / remove. */
export function EnrollmentsTab({
  examId,
  readOnly,
  canRemove,
}: {
  examId: string;
  readOnly: boolean;
  /** Candidates can only be removed before the exam goes live. */
  canRemove: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const list = useQuery({
    queryKey: qk.exams.enrollments(examId),
    queryFn: () => examsApi.enrollments(examId),
  });
  const paged = usePaged(list.data ?? [], 10);
  const remove = useRemoveEnrollment(examId);

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <FileUp className="h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add candidates
          </Button>
        </div>
      )}

      {list.isPending ? (
        <Skeleton className="h-32 w-full" />
      ) : list.isError ? (
        <EmptyState
          title="Could not load enrollments"
          text={list.error.message}
        />
      ) : list.data.length === 0 ? (
        <EmptyState
          title="No candidates enrolled"
          text={
            readOnly
              ? "No candidates have been enrolled in this exam."
              : "Add existing candidates or import a CSV to enroll them."
          }
          action={
            !readOnly ? (
              <Button onClick={() => setAddOpen(true)}>Add candidates</Button>
            ) : undefined
          }
        />
      ) : (
        <EnrolledCandidatesTable
          rows={paged.slice}
          canRemove={!readOnly && canRemove}
          removing={remove.isPending}
          onRemove={(id) => remove.mutate(id)}
        />
      )}

      <Pagination
        page={paged.page}
        pageSize={paged.pageSize}
        total={paged.total}
        onPage={paged.setPage}
        noun="candidates"
      />

      <EnrollCandidatesDialog
        examId={examId}
        open={addOpen}
        onOpenChange={setAddOpen}
      />

      <CandidateImportDialog
        examId={examId}
        open={importOpen}
        onOpenChange={setImportOpen}
      />
    </div>
  );
}
