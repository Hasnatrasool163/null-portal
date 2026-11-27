"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Pagination, usePaged } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/misc";
import { EmptyState, PageHeader } from "@/components/ui/blocks";
import { examsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { PHASES, type Phase } from "@/shared/schemas/exam";
import { CreateExamDialog } from "./list/create-exam-dialog";
import { ExamsTable } from "./list/exams-table";
import { PhaseFilter } from "./list/phase-filter";

export { PhaseStatus } from "./list/phase-status";

/** Exams index: search, phase filter, paged table and the "New exam" entry point. */
export function ExamsManager({ isAdmin }: { isAdmin: boolean }) {
  const [search, setSearch] = useState("");
  const [q] = useDebounce(search, 300);
  const searchParams = useSearchParams();
  // Dashboard KPI cards link here with ?phase=…
  const [phase, setPhase] = useState<Phase | "">(() => {
    const p = searchParams.get("phase");
    return PHASES.includes(p as Phase) ? (p as Phase) : "";
  });
  const [creating, setCreating] = useState(false);

  const list = useQuery({
    queryKey: qk.exams.list(q, phase),
    queryFn: () => examsApi.list({ q, phase }),
  });

  const paged = usePaged(list.data ?? [], 8);

  return (
    <>
      <PageHeader
        title="Exams"
        subtitle={
          isAdmin
            ? "Read-only platform oversight of all exams."
            : "Create drafts, assign questions, enroll candidates and publish."
        }
        actions={
          !isAdmin && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              New exam
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          label="Search exams"
          value={search}
          onChange={(v) => {
            setSearch(v);
            paged.setPage(1);
          }}
          phrases={[
            "Mathematics Diagnostic",
            "Computer Science",
            "Timer Demo",
            "final exam",
          ]}
        />
        <PhaseFilter
          value={phase}
          onChange={(p) => {
            setPhase(p);
            paged.setPage(1);
          }}
        />
      </div>

      {list.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : list.isError ? (
        <EmptyState
          title="Could not load exams"
          text={list.error.message}
          action={<Button onClick={() => list.refetch()}>Try again</Button>}
        />
      ) : list.data.length === 0 ? (
        <EmptyState
          title={q || phase ? "No exams match your filter" : "No exams yet"}
          text={
            q || phase
              ? "Try clearing your search or phase filter."
              : isAdmin
                ? "Exams created by examiners will appear here."
                : "Create your first draft exam to get started."
          }
          action={
            !isAdmin && !q && !phase ? (
              <Button onClick={() => setCreating(true)}>New exam</Button>
            ) : undefined
          }
        />
      ) : (
        <ExamsTable exams={paged.slice} isAdmin={isAdmin} />
      )}

      <Pagination
        page={paged.page}
        pageSize={paged.pageSize}
        total={paged.total}
        onPage={paged.setPage}
        noun="exams"
      />

      <CreateExamDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}
