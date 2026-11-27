"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Pagination, usePaged } from "@/components/ui/pagination";
import { Badge, Skeleton } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState, PageHeader } from "@/components/ui/blocks";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ExamForm } from "@/components/exam-form";
import { api } from "@/lib/api-client";
import {
  PHASES,
  PHASE_LABEL,
  type ExamDetail,
  type ExamSummary,
  type ExamValues,
  type Phase,
} from "@/shared/schemas/exam";

export function phaseBadgeClass(phase: Phase) {
  switch (phase) {
    case "ONGOING":
      return "bg-success/15 text-success";
    case "UPCOMING":
      return "bg-warning/15 text-warning";
    case "COMPLETED":
      return "bg-muted text-muted-foreground";
    default:
      return "";
  }
}

export function ExamsManager({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [q] = useDebounce(search, 300);
  const searchParams = useSearchParams();
  // Dashboard KPI cards link here with ?phase=…
  const [phase, setPhase] = useState<Phase | "">(() => {
    const p = searchParams.get("phase");
    return PHASES.includes(p as Phase) ? (p as Phase) : "";
  });
  const [creating, setCreating] = useState(false);

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (phase) params.set("phase", phase);

  const list = useQuery({
    queryKey: ["exams", q, phase],
    queryFn: () => api<ExamSummary[]>(`/api/exams?${params}`),
  });

  const paged = usePaged(list.data ?? [], 8);

  const create = useMutation({
    mutationFn: (v: ExamValues) =>
      api<ExamDetail>("/api/exams", { method: "POST", body: v }),
    onSuccess: (exam) => {
      toast.success("Exam created");
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["exams"] });
      router.push(`/exams/${exam.id}`);
    },
  });

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
          phrases={["Mathematics Diagnostic", "Computer Science", "Timer Demo", "final exam"]}
        />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by phase">
          <Button
            size="sm"
            variant="outline"
            aria-pressed={phase === ""}
            onClick={() => {
              setPhase("");
              paged.setPage(1);
            }}
          >
            All
          </Button>
          {PHASES.map((p) => (
            <Button
              key={p}
              size="sm"
              variant="outline"
              aria-pressed={phase === p}
              onClick={() => {
                setPhase(p);
                paged.setPage(1);
              }}
            >
              {PHASE_LABEL[p]}
            </Button>
          ))}
        </div>
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
        <Table>
          <THead>
            <TR>
              <TH>Title</TH>
              {isAdmin && <TH>Examiner</TH>}
              <TH>Phase</TH>
              <TH>Window</TH>
              <TH>Questions / Marks</TH>
              <TH>Enrolled</TH>
              <TH className="text-right">Action</TH>
            </TR>
          </THead>
          <TBody>
            {paged.slice.map((e) => (
              <TR key={e.id}>
                <TD>
                  <Link
                    href={`/exams/${e.id}`}
                    className="font-medium hover:underline"
                  >
                    {e.title}
                  </Link>
                  <p className="text-muted-foreground text-xs">
                    {e.durationMinutes} min
                  </p>
                </TD>
                {isAdmin && <TD>{e.ownerName}</TD>}
                <TD>
                  <Badge className={phaseBadgeClass(e.phase)}>
                    {PHASE_LABEL[e.phase]}
                  </Badge>
                </TD>
                <TD className="text-xs whitespace-nowrap">
                  <div>{format(new Date(e.startsAt), "PP p")}</div>
                  <div className="text-muted-foreground">
                    to {format(new Date(e.endsAt), "PP p")}
                  </div>
                </TD>
                <TD>
                  {e.questionCount} Q / {e.totalMarks} pts
                </TD>
                <TD>{e.enrollmentCount}</TD>
                <TD className="text-right">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/exams/${e.id}`}>
                      {isAdmin ? "Inspect" : "Manage"}
                    </Link>
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <Pagination
        page={paged.page}
        pageSize={paged.pageSize}
        total={paged.total}
        onPage={paged.setPage}
        noun="exams"
      />

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent
          className="max-h-[90vh] max-w-2xl overflow-y-auto"
          title="New exam"
          description="Starts as a draft. Assign questions and enroll candidates before publishing."
        >
          {creating && (
            <ExamForm
              onCancel={() => setCreating(false)}
              onSubmit={async (v) => {
                await create.mutateAsync(v as ExamValues);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
