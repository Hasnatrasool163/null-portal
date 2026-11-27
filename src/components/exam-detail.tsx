"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CopyPlus,
  Eye,
  FileUp,
  Lock,
  Plus,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Pagination, usePaged } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Badge, Skeleton, Spinner } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState, PageHeader, StatCard } from "@/components/ui/blocks";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ExamForm } from "@/components/exam-form";
import { CandidateImportDialog } from "@/components/candidate-import-dialog";
import { ExamAnalyticsTab } from "@/components/exam-analytics-tab";
import { ExamGradingTab } from "@/components/exam-grading-tab";
import { ExamMonitorTab } from "@/components/exam-monitor-tab";
import { AuditLogView } from "@/components/audit-log-view";
import { phaseBadgeClass } from "@/components/exams-manager";
import { api } from "@/lib/api-client";
import {
  MULTI_LABEL,
  PHASE_LABEL,
  type CandidateOption,
  type EnrolledCandidate,
  type ExamDetail,
  type ExamPatch,
  type ExamValues,
} from "@/shared/schemas/exam";
import {
  DIFFICULTY_LABEL,
  TYPE_LABEL,
  type QuestionList,
} from "@/shared/schemas/question";

type Tab =
  | "review"
  | "settings"
  | "questions"
  | "enrollments"
  | "monitor"
  | "grading"
  | "analytics"
  | "audit";
const TABS: Tab[] = ["review", "settings", "questions", "enrollments", "monitor", "grading", "analytics", "audit"];

function QuestionsTab({
  exam,
  readOnly,
}: {
  exam: ExamDetail;
  readOnly: boolean;
}) {
  const qc = useQueryClient();
  const locked = readOnly || exam.status !== "DRAFT";
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
  const [search, setSearch] = useState("");

  const bank = useQuery({
    queryKey: ["bank-picker", search],
    queryFn: () => {
      const p = new URLSearchParams({ pageSize: "50" });
      if (search.trim()) p.set("q", search.trim());
      return api<QuestionList>(`/api/questions?${p}`);
    },
    enabled: pickerOpen,
  });

  const save = useMutation({
    mutationFn: () =>
      api<ExamDetail>(`/api/exams/${exam.id}/questions`, {
        method: "PUT",
        body: {
          items: items.map((x) => ({
            questionId: x.questionId,
            marks: x.marks,
          })),
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPickerOpen(true)}>
              <Plus className="h-4 w-4" />
              Add from bank
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
              : "Pick questions from your bank and adjust their marks for this exam."
          }
          action={
            !locked ? (
              <Button onClick={() => setPickerOpen(true)}>Add from bank</Button>
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
                            k === idx ? { ...p, marks: Number.isNaN(v) ? 0 : v } : p,
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

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent
          className="max-h-[85vh] max-w-2xl overflow-y-auto"
          title="Add questions from your bank"
          description="Click Add to include a question. Save the question set when done."
        >
          <div className="space-y-3">
            <Input
              placeholder="Search your questions..."
              aria-label="Search question bank"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {bank.isPending ? (
              <Skeleton className="h-32 w-full" />
            ) : bank.isError ? (
              <p className="text-destructive text-sm">{bank.error.message}</p>
            ) : bank.data.items.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No matching questions in your bank.
              </p>
            ) : (
              <ul className="max-h-96 divide-y overflow-y-auto rounded-md border">
                {bank.data.items.map((q) => {
                  const added = assignedIds.has(q.id);
                  return (
                    <li
                      key={q.id}
                      className="flex items-start justify-between gap-3 p-3"
                    >
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-medium">
                          {q.body}
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {q.topicName} · {TYPE_LABEL[q.type]} ·{" "}
                          {DIFFICULTY_LABEL[q.difficulty]} · {q.defaultMarks}{" "}
                          pts
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={added ? "secondary" : "outline"}
                        disabled={added}
                        onClick={() => {
                          setItems((prev) => [
                            ...prev,
                            {
                              questionId: q.id,
                              body: q.body,
                              topicName: q.topicName,
                              type: q.type,
                              difficulty: q.difficulty,
                              marks: q.defaultMarks,
                            },
                          ]);
                          setDirty(true);
                        }}
                      >
                        {added ? "Added" : "Add"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setPickerOpen(false)}>Done</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EnrollmentsTab({
  examId,
  readOnly,
}: {
  examId: string;
  readOnly: boolean;
}) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const list = useQuery({
    queryKey: ["exam-enrollments", examId],
    queryFn: () =>
      api<EnrolledCandidate[]>(`/api/exams/${examId}/enrollments`),
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
              {!readOnly && <TH className="text-right">Remove</TH>}
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
                {!readOnly && (
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
  const [confirmAction, setConfirmAction] = useState<"publish" | "close" | null>(
    null,
  );

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
      api<ExamDetail & { skippedArchived: number }>(`/api/exams/${examId}/clone`, {
        method: "POST",
      }),
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
  const tabs: { id: Tab; label: string }[] = [
    { id: "review", label: "Review & Publish" },
    { id: "settings", label: "Settings" },
    { id: "questions", label: `Questions (${exam.questionCount})` },
    { id: "enrollments", label: `Enrollments (${exam.enrollmentCount})` },
    { id: "monitor", label: "Live Monitor" },
    { id: "grading", label: "Grading & Results" },
    { id: "analytics", label: "Analytics" },
    { id: "audit", label: "Audit log" },
  ];

  return (
    <>
      <div className="space-y-4">
        <BackButton href="/exams" label="All exams" />
        <PageHeader
          title={exam.title}
          subtitle={`${format(new Date(exam.startsAt), "PP p")} – ${format(new Date(exam.endsAt), "PP p")} · ${exam.durationMinutes} min`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={phaseBadgeClass(exam.phase)}>
                {PHASE_LABEL[exam.phase]}
              </Badge>
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
                <Button variant="outline" disabled={clone.isPending} onClick={() => clone.mutate()}>
                  {clone.isPending ? <Spinner /> : <CopyPlus className="h-4 w-4" />}
                  Duplicate
                </Button>
              )}
              {!isAdmin && exam.status === "DRAFT" && (
                <Button
                  disabled={!exam.readiness.ready}
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

      <div
        className="-mx-4 flex gap-1 overflow-x-auto overflow-y-hidden border-b px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Exam sections"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`relative shrink-0 rounded-t-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.id
                ? "text-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`}
          >
            {t.label}
            <span
              aria-hidden="true"
              className={`bg-primary absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-transform duration-200 ${
                tab === t.id ? "scale-x-100" : "scale-x-0"
              }`}
            />
          </button>
        ))}
      </div>
      <div key={tab} className="animate-page-in space-y-6">

      {tab === "review" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Questions" value={exam.questionCount} />
            <StatCard label="Total marks" value={exam.totalMarks} />
            <StatCard label="Enrolled candidates" value={exam.enrollmentCount} />
            <StatCard label="Duration" value={`${exam.durationMinutes} min`} />
          </div>

          {exam.status === "DRAFT" && (
            <Card>
              <CardHeader>
                <CardTitle>Publish readiness</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {exam.readiness.blockers.length === 0 ? (
                  <p className="text-success flex items-center gap-2 font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    All publish requirements are met.
                  </p>
                ) : (
                  <ul className="text-destructive space-y-1">
                    {exam.readiness.blockers.map((b, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
                {exam.readiness.warnings.map((w, i) => (
                  <p
                    key={i}
                    className="text-warning flex items-center gap-2"
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {w}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Configuration summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 text-sm">
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["Multi-choice scoring", MULTI_LABEL[exam.multiScoring]],
                  ["Negative marking", exam.negativeMarking > 0 ? `${exam.negativeMarking * 100}% per wrong answer` : "Off"],
                  ["Question order", exam.shuffleQuestions ? "Shuffled" : "Fixed"],
                  ["Option order", exam.shuffleOptions ? "Shuffled" : "Fixed"],
                  ["Offline recovery window", exam.recoveryWindowSeconds > 0 ? `${exam.recoveryWindowSeconds} seconds` : "Disabled"],
                  ["Answer key", exam.showAnswers ? "Shown after results publish" : "Never shown"],
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
                  <p className="text-muted-foreground text-xs">Instructions</p>
                  <p className="whitespace-pre-wrap">{exam.instructions}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "settings" && (
        <Card>
          <CardContent className="pt-6">
            <ExamForm
              key={`${exam.id}-${exam.status}`}
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
        <EnrollmentsTab examId={exam.id} readOnly={isAdmin} />
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
              ? "Once published, the question set, marks, schedule and scoring rules are locked. Only title and instructions remain editable."
              : "Closing prevents any new attempts from starting and moves the exam to Completed."
          }
        >
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
              {confirmAction === "publish" ? "Publish" : "Close exam"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
