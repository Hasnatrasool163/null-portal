"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  Award,
  CalendarClock,
  Check,
  ListChecks,
  Pencil,
  Timer,
  UserPlus,
  Users,
  type LucideIcon,
  CopyPlus,
  Eye,
  FileUp,
  Lock,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import {
  UnderlineTabs,
  type UnderlineTab,
} from "@/components/ui/underline-tabs";
import { Pagination, usePaged } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Badge, Skeleton, Spinner } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState, PageHeader } from "@/components/ui/blocks";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ExamForm } from "@/components/exam-form";
import { QuestionPickerDialog } from "@/components/question-picker-dialog";
import { cn } from "@/lib/utils";
import { CandidateImportDialog } from "@/components/candidate-import-dialog";
import { ExamAnalyticsTab } from "@/components/exam-analytics-tab";
import { ExamGradingTab } from "@/components/exam-grading-tab";
import { ExamMonitorTab } from "@/components/exam-monitor-tab";
import { AuditLogView } from "@/components/audit-log-view";
import { PhaseStatus } from "@/components/exams-manager";
import {
  AdminExamActions,
  RescorePanel,
} from "@/components/exam-lifecycle-panels";
import { api } from "@/lib/api-client";
import { editLevel } from "@/shared/exam-lifecycle";
import {
  MULTI_LABEL,
  type CandidateOption,
  type EnrolledCandidate,
  type ExamDetail,
  type ExamPatch,
  type ExamValues,
} from "@/shared/schemas/exam";
import { TYPE_LABEL } from "@/shared/schemas/question";

type Tab =
  | "review"
  | "settings"
  | "questions"
  | "enrollments"
  | "monitor"
  | "grading"
  | "analytics"
  | "audit";
const TABS: Tab[] = [
  "review",
  "settings",
  "questions",
  "enrollments",
  "monitor",
  "grading",
  "analytics",
  "audit",
];

function QuestionsTab({
  exam,
  readOnly,
}: {
  exam: ExamDetail;
  readOnly: boolean;
}) {
  const qc = useQueryClient();
  const locked = readOnly || editLevel(exam) !== "FULL";
  const [items, setItems] = useState(
    exam.questions.map((q) => ({
      questionId: q.questionId,
      body: q.body,
      topicName: q.topicName,
      type: q.type,
      difficulty: q.difficulty,
      marks: q.marks,
    })),
  );
  const [dirty, setDirty] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const save = useMutation({
    mutationFn: () =>
      api<ExamDetail>(`/api/exams/${exam.id}/questions`, {
        method: "PUT",
        body: {
          items: items.map((x) => ({
            questionId: x.questionId,
            marks: x.marks,
          })),
          updatedAt: exam.updatedAt,
        },
      }),
    onSuccess: (updated) => {
      toast.success("Question set saved");
      setDirty(false);
      qc.setQueryData(["exam", exam.id], updated);
      qc.invalidateQueries({ queryKey: ["exams"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const assignedIds = new Set(items.map((x) => x.questionId));
  const totalMarks = items.reduce((s, x) => s + (Number(x.marks) || 0), 0);

  function move(i: number, delta: -1 | 1) {
    const j = i + delta;
    if (j < 0 || j >= items.length) return;
    const copy = [...items];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setItems(copy);
    setDirty(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          <b>{items.length}</b> question(s) · Total <b>{totalMarks}</b> marks
          {locked && (
            <span className="ml-2 inline-flex items-center gap-1">
              <Lock className="h-3.5 w-3.5" /> Locked after publishing
            </span>
          )}
        </p>
        {!locked && (
          <div className="flex flex-wrap items-center gap-2">
            {dirty && (
              <span
                className="text-warning flex items-center gap-1.5 text-xs font-medium"
                role="status"
              >
                <span
                  className="bg-warning h-1.5 w-1.5 rounded-full"
                  aria-hidden="true"
                />
                Unsaved changes
              </span>
            )}
            <Button variant="outline" onClick={() => setPickerOpen(true)}>
              <Plus className="h-4 w-4" />
              Add questions
            </Button>
            <Button
              disabled={!dirty || save.isPending}
              onClick={() => save.mutate()}
            >
              {save.isPending && <Spinner />}
              Save question set
            </Button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No questions assigned"
          text={
            locked
              ? "This exam has no questions."
              : "Choose questions from your bank, or draw them at random by topic and difficulty."
          }
          action={
            !locked ? (
              <Button onClick={() => setPickerOpen(true)}>
                <Plus className="h-4 w-4" />
                Add questions
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>#</TH>
              <TH>Question</TH>
              <TH>Topic</TH>
              <TH>Type</TH>
              <TH>Marks</TH>
              {!locked && <TH className="text-right">Order / Remove</TH>}
            </TR>
          </THead>
          <TBody>
            {items.map((it, idx) => (
              <TR key={it.questionId}>
                <TD className="text-muted-foreground">{idx + 1}</TD>
                <TD className="max-w-md">
                  <p className="line-clamp-2 font-medium">{it.body}</p>
                </TD>
                <TD>{it.topicName}</TD>
                <TD>
                  <Badge>{TYPE_LABEL[it.type]}</Badge>
                </TD>
                <TD>
                  {locked ? (
                    it.marks
                  ) : (
                    <Input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="100"
                      aria-label={`Marks for question ${idx + 1}`}
                      className="h-8 w-20"
                      value={it.marks}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setItems((prev) =>
                          prev.map((p, k) =>
                            k === idx
                              ? { ...p, marks: Number.isNaN(v) ? 0 : v }
                              : p,
                          ),
                        );
                        setDirty(true);
                      }}
                    />
                  )}
                </TD>
                {!locked && (
                  <TD className="text-right whitespace-nowrap">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Move up"
                      disabled={idx === 0}
                      onClick={() => move(idx, -1)}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Move down"
                      disabled={idx === items.length - 1}
                      onClick={() => move(idx, 1)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Remove question"
                      onClick={() => {
                        setItems((prev) => prev.filter((_, k) => k !== idx));
                        setDirty(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TD>
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <QuestionPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        assignedIds={assignedIds}
        onAdd={(picked) => {
          setItems((prev) => [
            ...prev,
            ...picked
              .filter((q) => !prev.some((x) => x.questionId === q.id))
              .map((q) => ({
                questionId: q.id,
                body: q.body,
                topicName: q.topicName,
                type: q.type,
                difficulty: q.difficulty,
                marks: q.defaultMarks,
              })),
          ]);
          setDirty(true);
        }}
      />
    </div>
  );
}

/** Draft setup as a short guided flow: what's done, what's next, one action per step. */
function SetupSteps({
  exam,
  onOpenTab,
  onPublish,
}: {
  exam: ExamDetail;
  onOpenTab: (t: Tab) => void;
  onPublish: () => void;
}) {
  // Blockers that aren't covered by a step (e.g. schedule problems) belong to the schedule step.
  const scheduleIssues = exam.readiness.blockers.filter(
    (b) => !/question|marks|candidate/i.test(b),
  );
  const steps: {
    title: string;
    done: boolean;
    detail: string;
    action?: { label: string; icon: LucideIcon; onClick: () => void };
  }[] = [
    {
      title: "Schedule and rules",
      done: scheduleIssues.length === 0,
      detail:
        scheduleIssues[0] ??
        `${exam.durationMinutes} min, ${MULTI_LABEL[exam.multiScoring].toLowerCase()} scoring`,
      action: {
        label: scheduleIssues.length ? "Fix schedule" : "Edit",
        icon: scheduleIssues.length ? CalendarClock : Pencil,
        onClick: () => onOpenTab("settings"),
      },
    },
    {
      title: "Add questions",
      done: exam.questionCount > 0 && exam.totalMarks > 0,
      detail:
        exam.questionCount > 0
          ? `${exam.questionCount} question${exam.questionCount === 1 ? "" : "s"} · ${exam.totalMarks} marks`
          : "Choose from your bank or draw at random by rules.",
      action: {
        label: exam.questionCount > 0 ? "Edit" : "Add questions",
        icon: exam.questionCount > 0 ? Pencil : Plus,
        onClick: () => onOpenTab("questions"),
      },
    },
    {
      title: "Enroll candidates",
      done: exam.enrollmentCount > 0,
      detail:
        exam.enrollmentCount > 0
          ? `${exam.enrollmentCount} candidate${exam.enrollmentCount === 1 ? "" : "s"} enrolled`
          : "Pick candidates or import a list.",
      action: {
        label: exam.enrollmentCount > 0 ? "Edit" : "Enroll",
        icon: exam.enrollmentCount > 0 ? Pencil : UserPlus,
        onClick: () => onOpenTab("enrollments"),
      },
    },
  ];
  const doneCount = steps.filter((x) => x.done).length;
  const ready = exam.readiness.ready;
  const next = steps.findIndex((x) => !x.done);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-3.5">
        <div>
          <h3 className="font-semibold">Set up this exam</h3>
          <p className="text-muted-foreground text-xs">
            {ready
              ? "Everything is in place. Review and publish."
              : `${doneCount} of ${steps.length} steps done`}
          </p>
        </div>
        <div
          className="bg-muted h-1.5 w-28 overflow-hidden rounded-full"
          aria-hidden="true"
        >
          <div
            className="bg-primary h-full rounded-full transition-[width] duration-500"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
      </div>
      <ol className="divide-y">
        {steps.map((st, i) => (
          <li key={st.title} className="flex items-center gap-4 px-5 py-3.5">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
                st.done
                  ? "bg-primary border-primary text-primary-foreground"
                  : i === next
                    ? "border-primary text-primary"
                    : "text-muted-foreground",
              )}
              aria-hidden="true"
            >
              {st.done ? (
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              ) : (
                i + 1
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {st.title}
                <span className="sr-only">
                  {st.done ? " (done)" : " (to do)"}
                </span>
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {st.detail}
              </p>
            </div>
            {st.action && (
              <Button
                size="sm"
                className="min-w-24"
                variant={i === next ? "default" : "outline"}
                onClick={st.action.onClick}
              >
                <st.action.icon className="h-3.5 w-3.5" />
                {st.action.label}
              </Button>
            )}
          </li>
        ))}
        <li className="flex items-center gap-4 px-5 py-3.5">
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
              ready ? "border-primary text-primary" : "text-muted-foreground",
            )}
            aria-hidden="true"
          >
            {steps.length + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Review and publish</p>
            <p className="text-muted-foreground text-xs">
              {ready
                ? "Candidates see it once the window opens."
                : "Available once the steps above are done."}
            </p>
          </div>
          <Button
            size="sm"
            className="min-w-24"
            disabled={!ready}
            onClick={onPublish}
          >
            <Send className="h-3.5 w-3.5" />
            Publish
          </Button>
        </li>
      </ol>
    </Card>
  );
}

/** What publishing will lock, shown in the confirmation dialog. */
function PublishSummary({ exam }: { exam: ExamDetail }) {
  const rows: [string, string][] = [
    [
      "Window",
      `${format(new Date(exam.startsAt), "PP p")} – ${format(new Date(exam.endsAt), "PP p")}`,
    ],
    ["Duration", `${exam.durationMinutes} min`],
    ["Questions", `${exam.questionCount} · ${exam.totalMarks} marks`],
    ["Candidates", String(exam.enrollmentCount)],
    [
      "Scoring",
      `${MULTI_LABEL[exam.multiScoring]}${exam.negativeMarking > 0 ? `, −${exam.negativeMarking * 100}% per wrong answer` : ""}`,
    ],
    [
      "Order",
      `${exam.shuffleQuestions ? "Shuffled" : "Fixed"} questions, ${exam.shuffleOptions ? "shuffled" : "fixed"} options`,
    ],
  ];
  return (
    <dl className="mb-5 divide-y rounded-md border text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[6.5rem_1fr] gap-3 px-3 py-2.5">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function EnrollmentsTab({
  examId,
  readOnly,
  canRemove,
}: {
  examId: string;
  readOnly: boolean;
  /** Candidates can only be removed before the exam goes live. */
  canRemove: boolean;
}) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const list = useQuery({
    queryKey: ["exam-enrollments", examId],
    queryFn: () => api<EnrolledCandidate[]>(`/api/exams/${examId}/enrollments`),
  });

  const candidates = useQuery({
    queryKey: ["candidate-search", examId, search],
    queryFn: () => {
      const p = new URLSearchParams({ examId });
      if (search.trim()) p.set("q", search.trim());
      return api<CandidateOption[]>(`/api/candidates?${p}`);
    },
    enabled: addOpen,
  });

  const paged = usePaged(list.data ?? [], 10);

  const enroll = useMutation({
    mutationFn: (ids: string[]) =>
      api<{ added: number }>(`/api/exams/${examId}/enrollments`, {
        method: "POST",
        body: { candidateIds: ids },
      }),
    onSuccess: (r) => {
      toast.success(`Enrolled ${r.added} candidate(s)`);
      setSelected(new Set());
      setAddOpen(false);
      qc.invalidateQueries({ queryKey: ["exam-enrollments", examId] });
      qc.invalidateQueries({ queryKey: ["exam", examId] });
      qc.invalidateQueries({ queryKey: ["exams"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (candidateId: string) =>
      api(`/api/exams/${examId}/enrollments/${candidateId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Candidate removed");
      qc.invalidateQueries({ queryKey: ["exam-enrollments", examId] });
      qc.invalidateQueries({ queryKey: ["exam", examId] });
      qc.invalidateQueries({ queryKey: ["exams"] });
    },
    onError: (e) => toast.error(e.message),
  });

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
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Email</TH>
              <TH>Enrolled</TH>
              {!readOnly && canRemove && <TH className="text-right">Remove</TH>}
            </TR>
          </THead>
          <TBody>
            {paged.slice.map((c) => (
              <TR key={c.id}>
                <TD className="font-medium">{c.name}</TD>
                <TD>{c.email}</TD>
                <TD className="text-muted-foreground text-xs">
                  {format(new Date(c.enrolledAt), "PP p")}
                </TD>
                {!readOnly && canRemove && (
                  <TD className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove ${c.name}`}
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(c.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TD>
                )}
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
        noun="candidates"
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent
          className="max-w-lg"
          title="Enroll candidates"
          description="Select active candidate accounts to enroll in this exam."
        >
          <div className="space-y-3">
            <Input
              placeholder="Search by name or email..."
              aria-label="Search candidates"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {candidates.isPending ? (
              <Skeleton className="h-32 w-full" />
            ) : candidates.data?.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No matching active candidates.
              </p>
            ) : (
              <ul className="max-h-72 divide-y overflow-y-auto rounded-md border">
                {candidates.data?.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <label className="flex flex-1 cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        className="choice"
                        disabled={c.enrolled}
                        checked={c.enrolled || selected.has(c.id)}
                        onChange={(e) => {
                          const next = new Set(selected);
                          if (e.target.checked) next.add(c.id);
                          else next.delete(c.id);
                          setSelected(next);
                        }}
                      />
                      <span>
                        <span className="font-medium">{c.name}</span>{" "}
                        <span className="text-muted-foreground text-xs">
                          ({c.email})
                        </span>
                      </span>
                    </label>
                    {c.enrolled && <Badge>Enrolled</Badge>}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={selected.size === 0 || enroll.isPending}
                onClick={() => enroll.mutate([...selected])}
              >
                {enroll.isPending && <Spinner />}
                Enroll ({selected.size})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CandidateImportDialog
        examId={examId}
        open={importOpen}
        onOpenChange={setImportOpen}
      />
    </div>
  );
}

export function ExamDetailView({
  examId,
  isAdmin,
}: {
  examId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get("tab");
    return TABS.includes(t as Tab) ? (t as Tab) : "review";
  });
  const [confirmAction, setConfirmAction] = useState<
    "publish" | "close" | null
  >(null);

  const sandbox = useMutation({
    mutationFn: (reset: boolean) =>
      api<{ attemptId: string }>(`/api/exams/${examId}/sandbox`, {
        method: "POST",
        body: { reset },
      }),
    onSuccess: (r) => router.push(`/attempts/${r.attemptId}`),
    onError: (e) => toast.error(e.message),
  });

  const clone = useMutation({
    mutationFn: () =>
      api<ExamDetail & { skippedArchived: number }>(
        `/api/exams/${examId}/clone`,
        {
          method: "POST",
        },
      ),
    onSuccess: (copy) => {
      toast.success(
        copy.skippedArchived > 0
          ? `Draft copy created. ${copy.skippedArchived} archived question(s) were left out.`
          : "Draft copy created. Review the schedule, then publish.",
      );
      qc.invalidateQueries({ queryKey: ["exams"] });
      router.push(`/exams/${copy.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const query = useQuery({
    queryKey: ["exam", examId],
    queryFn: () => api<ExamDetail>(`/api/exams/${examId}`),
  });

  const update = useMutation({
    mutationFn: (v: ExamValues | ExamPatch) =>
      api<ExamDetail>(`/api/exams/${examId}`, { method: "PATCH", body: v }),
    onSuccess: (updated) => {
      toast.success("Exam updated");
      qc.setQueryData(["exam", examId], updated);
      qc.invalidateQueries({ queryKey: ["exams"] });
    },
    onError: (e) => {
      // A stale updatedAt (409) means someone else changed the exam: reload it.
      void e;
      qc.invalidateQueries({ queryKey: ["exam", examId] });
    },
  });

  const publish = useMutation({
    mutationFn: () =>
      api<ExamDetail>(`/api/exams/${examId}/publish`, { method: "POST" }),
    onSuccess: (updated) => {
      toast.success("Exam published");
      setConfirmAction(null);
      qc.setQueryData(["exam", examId], updated);
      qc.invalidateQueries({ queryKey: ["exams"] });
      qc.invalidateQueries({ queryKey: ["questions"] });
    },
    onError: (e) => {
      setConfirmAction(null);
      toast.error(e.message);
    },
  });

  const close = useMutation({
    mutationFn: () =>
      api<ExamDetail>(`/api/exams/${examId}/close`, { method: "POST" }),
    onSuccess: (updated) => {
      toast.success("Exam closed");
      setConfirmAction(null);
      qc.setQueryData(["exam", examId], updated);
      qc.invalidateQueries({ queryKey: ["exams"] });
    },
    onError: (e) => {
      setConfirmAction(null);
      toast.error(e.message);
    },
  });

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <EmptyState
        title="Could not load exam"
        text={query.error.message}
        action={
          <Button asChild variant="outline">
            <Link href="/exams">Back to exams</Link>
          </Button>
        }
      />
    );
  }

  const exam = query.data;
  const tabs: UnderlineTab<Tab>[] = [
    { id: "review", label: "Review & publish" },
    { id: "settings", label: "Settings" },
    { id: "questions", label: "Questions", count: exam.questionCount },
    { id: "enrollments", label: "Enrollments", count: exam.enrollmentCount },
    { id: "monitor", label: "Live monitor" },
    { id: "grading", label: "Grading & results" },
    { id: "analytics", label: "Analytics" },
    { id: "audit", label: "Audit log" },
  ];
  // Keep the tab in the URL (refresh + shareable links) without a navigation.
  const openTab = (t: Tab) => {
    setTab(t);
    window.history.replaceState(null, "", `?tab=${t}`);
  };

  return (
    <>
      <div className="space-y-4">
        <BackButton href="/exams" label="All exams" />
        <PageHeader
          title={exam.title}
          subtitle={`${format(new Date(exam.startsAt), "PP p")} – ${format(new Date(exam.endsAt), "PP p")} · ${exam.durationMinutes} min`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <PhaseStatus
                phase={exam.phase}
                className="bg-card shadow-elev-1 h-10 rounded-md border px-3"
              />
              {!isAdmin && exam.questionCount > 0 && (
                <Button
                  variant="outline"
                  disabled={sandbox.isPending}
                  onClick={() => sandbox.mutate(false)}
                >
                  <Eye className="h-4 w-4" />
                  Preview as candidate
                </Button>
              )}
              {!isAdmin && (
                <Button
                  variant="outline"
                  disabled={clone.isPending}
                  onClick={() => clone.mutate()}
                >
                  {clone.isPending ? (
                    <Spinner />
                  ) : (
                    <CopyPlus className="h-4 w-4" />
                  )}
                  Duplicate
                </Button>
              )}
              {!isAdmin && exam.status === "DRAFT" && (
                <Button
                  disabled={!exam.readiness.ready}
                  tooltip={
                    exam.readiness.ready
                      ? undefined
                      : `Finish setup first: ${exam.readiness.blockers[0] ?? ""}`
                  }
                  onClick={() => setConfirmAction("publish")}
                >
                  <Send className="h-4 w-4" />
                  Publish exam
                </Button>
              )}
              {!isAdmin && exam.status === "PUBLISHED" && (
                <Button
                  variant="destructive"
                  onClick={() => setConfirmAction("close")}
                >
                  Close exam
                </Button>
              )}
            </div>
          }
        />
      </div>

      <UnderlineTabs
        tabs={tabs}
        value={tab}
        onChange={openTab}
        label="Exam sections"
        className="-mx-4 px-4 sm:mx-0 sm:px-0"
      />
      <div key={tab} className="animate-page-in space-y-6">
        {tab === "review" && (
          <div className="space-y-6">
            <Card className="grid grid-cols-2 divide-y sm:grid-cols-4 sm:divide-x sm:divide-y-0">
              {[
                {
                  label: "Questions",
                  value: exam.questionCount,
                  tab: "questions" as Tab,
                  icon: ListChecks,
                },
                {
                  label: "Total marks",
                  value: exam.totalMarks,
                  tab: "questions" as Tab,
                  icon: Award,
                },
                {
                  label: "Candidates",
                  value: exam.enrollmentCount,
                  tab: "enrollments" as Tab,
                  icon: Users,
                },
                {
                  label: "Duration",
                  value: `${exam.durationMinutes} min`,
                  tab: "settings" as Tab,
                  icon: Timer,
                },
              ].map((st) => (
                <button
                  key={st.label}
                  type="button"
                  onClick={() => openTab(st.tab)}
                  className="group hover:bg-muted/40 focus-visible:ring-ring flex items-center gap-3.5 px-5 py-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                >
                  <span className="bg-accent text-accent-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105">
                    <st.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="text-muted-foreground block text-xs">
                      {st.label}
                    </span>
                    <span className="mt-0.5 block text-2xl leading-tight font-semibold tracking-tight tabular-nums">
                      {st.value}
                    </span>
                  </span>
                </button>
              ))}
            </Card>

            {exam.status === "DRAFT" && !isAdmin && (
              <SetupSteps
                exam={exam}
                onOpenTab={openTab}
                onPublish={() => setConfirmAction("publish")}
              />
            )}

            <Card>
              <CardHeader>
                <CardTitle>Configuration summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 text-sm">
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ["Multi-choice scoring", MULTI_LABEL[exam.multiScoring]],
                    [
                      "Negative marking",
                      exam.negativeMarking > 0
                        ? `${exam.negativeMarking * 100}% per wrong answer`
                        : "Off",
                    ],
                    [
                      "Question order",
                      exam.shuffleQuestions ? "Shuffled" : "Fixed",
                    ],
                    [
                      "Option order",
                      exam.shuffleOptions ? "Shuffled" : "Fixed",
                    ],
                    [
                      "Offline recovery window",
                      exam.recoveryWindowSeconds > 0
                        ? `${exam.recoveryWindowSeconds} seconds`
                        : "Disabled",
                    ],
                    [
                      "Answer key",
                      exam.showAnswers
                        ? "Shown after results publish"
                        : "Never shown",
                    ],
                    ["Examiner", exam.ownerName],
                  ].map(([label, value]) => (
                    <div key={label} className="space-y-0.5">
                      <dt className="text-muted-foreground text-xs">{label}</dt>
                      <dd className="font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
                {exam.instructions && (
                  <div className="bg-muted/50 space-y-1 rounded-md p-3">
                    <p className="text-muted-foreground text-xs">
                      Instructions
                    </p>
                    <p className="whitespace-pre-wrap">{exam.instructions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {exam.status === "CLOSED" && exam.closeReason && (
          <p className="bg-muted text-muted-foreground rounded-md p-3 text-sm">
            {exam.cancelled ? "Cancelled" : "Closed"} by an administrator:{" "}
            {exam.closeReason}
          </p>
        )}
        {isAdmin && <AdminExamActions exam={exam} />}
        <RescorePanel exam={exam} readOnly={isAdmin} />

        {tab === "settings" && (
          <Card>
            <CardContent className="pt-6">
              <ExamForm
                key={`${exam.id}-${exam.updatedAt}`}
                exam={exam}
                readOnly={isAdmin}
                onSubmit={async (v) => {
                  await update.mutateAsync(v);
                }}
              />
            </CardContent>
          </Card>
        )}

        {tab === "questions" && (
          <QuestionsTab
            key={`${exam.id}-${exam.status}-${exam.questions.length}`}
            exam={exam}
            readOnly={isAdmin}
          />
        )}

        {tab === "enrollments" && (
          <EnrollmentsTab
            examId={exam.id}
            readOnly={isAdmin || editLevel(exam) === "TITLE_ONLY"}
            canRemove={editLevel(exam) === "FULL"}
          />
        )}

        {tab === "monitor" && (
          <ExamMonitorTab examId={exam.id} readOnly={isAdmin} />
        )}

        {tab === "grading" && (
          <ExamGradingTab examId={exam.id} readOnly={isAdmin} />
        )}

        {tab === "analytics" && <ExamAnalyticsTab examId={exam.id} />}
        {tab === "audit" && <AuditLogView examId={exam.id} />}
      </div>

      <Dialog
        open={confirmAction !== null}
        onOpenChange={(o) => !o && setConfirmAction(null)}
      >
        <DialogContent
          title={
            confirmAction === "publish" ? "Publish exam?" : "Close exam now?"
          }
          description={
            confirmAction === "publish"
              ? "Check the details below. Publishing locks the questions, marks, schedule and scoring; only the title and instructions stay editable."
              : "Closing prevents any new attempts from starting and moves the exam to Completed."
          }
        >
          {confirmAction === "publish" && <PublishSummary exam={exam} />}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmAction === "close" ? "destructive" : "default"}
              disabled={publish.isPending || close.isPending}
              onClick={() =>
                confirmAction === "publish" ? publish.mutate() : close.mutate()
              }
            >
              {(publish.isPending || close.isPending) && <Spinner />}
              {confirmAction === "publish" ? "Publish exam" : "Close exam"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
