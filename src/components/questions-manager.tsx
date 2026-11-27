"use client";
import { useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import {
  Archive,
  ArchiveRestore,
  Copy,
  Eye,
  FileUp,
  Lock,
  Pencil,
  Plus,
  Tags,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Badge, Skeleton, Spinner } from "@/components/ui/misc";
import { RowMenu } from "@/components/ui/row-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState, PageHeader } from "@/components/ui/blocks";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { QuestionForm } from "@/components/question-form";
import { QuestionImportDialog } from "@/components/question-import-dialog";
import { QuestionPreviewDialog } from "@/components/question-preview-dialog";
import { TopicsDialog, useTopics } from "@/components/topics-dialog";
import { api } from "@/lib/api-client";
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  QUESTION_TYPES,
  TYPE_LABEL,
  type Difficulty,
  type QuestionDetail,
  type QuestionInput,
  type QuestionList,
  type QuestionListItem,
  type QuestionType,
} from "@/shared/schemas/question";

const PAGE_SIZE = 10;

export function QuestionsManager() {
  const qc = useQueryClient();
  const topics = useTopics();
  const [search, setSearch] = useState("");
  const [q] = useDebounce(search, 300);
  const [topicId, setTopicId] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [type, setType] = useState<QuestionType | "">("");
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<QuestionListItem | null>(null);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
  });
  if (q) params.set("q", q);
  if (topicId) params.set("topicId", topicId);
  if (difficulty) params.set("difficulty", difficulty);
  if (type) params.set("type", type);
  if (status === "archived") params.set("status", "archived");

  const list = useQuery({
    queryKey: ["questions", q, topicId, difficulty, type, status, page],
    queryFn: () => api<QuestionList>(`/api/questions?${params}`),
    placeholderData: keepPreviousData,
  });

  const detail = useQuery({
    queryKey: ["question", editing],
    queryFn: () => api<QuestionDetail>(`/api/questions/${editing}`),
    enabled: !!editing && editing !== "new",
    gcTime: 0,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["questions"] });
    qc.invalidateQueries({ queryKey: ["topics"] });
  };

  const save = useMutation({
    mutationFn: (v: QuestionInput) =>
      editing && editing !== "new"
        ? api(`/api/questions/${editing}`, { method: "PATCH", body: v })
        : api("/api/questions", { method: "POST", body: v }),
    onSuccess: () => {
      toast.success(editing === "new" ? "Question created" : "Question saved");
      setEditing(null);
      refresh();
    },
  });
  const archive = useMutation({
    mutationFn: (id: string) =>
      api(`/api/questions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Question archived");
      setArchiving(null);
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const restore = useMutation({
    mutationFn: (id: string) =>
      api(`/api/questions/${id}/restore`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Question restored to your bank");
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const duplicate = useMutation({
    mutationFn: (id: string) =>
      api<QuestionDetail>(`/api/questions/${id}/duplicate`, {
        method: "POST",
      }),
    onSuccess: (copy) => {
      toast.success("Duplicated. Edit the copy below.");
      refresh();
      setEditing(copy.id);
    },
    onError: (e) => toast.error(e.message),
  });

  const total = list.data?.total ?? 0;
  const filtered = !!(q || topicId || difficulty || type);

  return (
    <>
      <PageHeader
        title="Question bank"
        subtitle="Your private questions, grouped by topic. Only you can see them."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setTopicsOpen(true)}>
              <Tags className="h-4 w-4" />
              Topics
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileUp className="h-4 w-4" />
              Import
            </Button>
            <Button onClick={() => setEditing("new")}>
              <Plus className="h-4 w-4" />
              New question
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-3">
        <SearchInput
          label="Search questions"
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          phrases={[
            "binary search",
            "TCP handshake",
            "derivative of x²",
            "normalization",
          ]}
        />
        <Select
          className="w-44"
          aria-label="Filter by topic"
          value={topicId}
          onChange={(e) => {
            setTopicId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All topics</option>
          {topics.data?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        <Select
          className="w-40"
          aria-label="Filter by difficulty"
          value={difficulty}
          onChange={(e) => {
            setDifficulty(e.target.value as Difficulty | "");
            setPage(1);
          }}
        >
          <option value="">All difficulties</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABEL[d]}
            </option>
          ))}
        </Select>
        <Select
          className="w-44"
          aria-label="Filter by type"
          value={type}
          onChange={(e) => {
            setType(e.target.value as QuestionType | "");
            setPage(1);
          }}
        >
          <option value="">All types</option>
          {QUESTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t]}
            </option>
          ))}
        </Select>
        <div
          role="tablist"
          aria-label="Question status"
          className="bg-muted ml-auto flex h-10 gap-0.5 rounded-md p-1"
        >
          {(["active", "archived"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={status === s}
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
              className={`flex items-center gap-1.5 rounded-[5px] px-3 text-sm font-medium transition-[background-color,color,box-shadow] ${
                status === s
                  ? "bg-card text-foreground shadow-elev-1"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "archived" && (
                <Archive className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {s === "active" ? "Active" : "Archived"}
            </button>
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
          title="Could not load questions"
          text={list.error.message}
          action={<Button onClick={() => list.refetch()}>Try again</Button>}
        />
      ) : list.data.items.length === 0 ? (
        <EmptyState
          title={
            status === "archived"
              ? "No archived questions"
              : filtered
                ? "No questions match your filters"
                : "No questions yet"
          }
          text={
            status === "archived"
              ? "Questions you archive appear here and can be restored."
              : filtered
                ? "Try clearing a filter."
                : "Create a topic, then add questions one by one or import a CSV/JSON file."
          }
          action={
            !filtered && status === "active" ? (
              <Button onClick={() => setEditing("new")}>New question</Button>
            ) : undefined
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Question</TH>
              <TH>Topic</TH>
              <TH>Type</TH>
              <TH>Difficulty</TH>
              <TH>Marks</TH>
              <TH className="w-14">
                <span className="sr-only">Actions</span>
              </TH>
            </TR>
          </THead>
          <TBody>
            {list.data.items.map((it) => (
              <TR key={it.id}>
                <TD className="max-w-sm">
                  <p className="line-clamp-2 font-medium">{it.body}</p>
                  {it.locked && (
                    <span className="text-muted-foreground mt-0.5 inline-flex items-center gap-1 text-xs">
                      <Lock className="h-3 w-3" /> In published exam (duplicate
                      to edit)
                    </span>
                  )}
                </TD>
                <TD>{it.topicName}</TD>
                <TD>
                  <Badge>{TYPE_LABEL[it.type]}</Badge>
                </TD>
                <TD>{DIFFICULTY_LABEL[it.difficulty]}</TD>
                <TD>{it.defaultMarks}</TD>
                <TD className="w-14 text-right">
                  {restore.isPending && restore.variables === it.id ? (
                    <span className="inline-flex h-8 w-8 items-center justify-center">
                      <Spinner />
                    </span>
                  ) : (
                    <RowMenu
                      label="Actions for this question"
                      items={
                        status === "archived"
                          ? [
                              {
                                label: "Preview",
                                icon: Eye,
                                onSelect: () => setPreviewing(it.id),
                              },
                              {
                                label: "Restore",
                                icon: ArchiveRestore,
                                onSelect: () => restore.mutate(it.id),
                              },
                            ]
                          : [
                              {
                                label: "Preview",
                                icon: Eye,
                                onSelect: () => setPreviewing(it.id),
                              },
                              {
                                label: "Edit",
                                icon: Pencil,
                                onSelect: () => setEditing(it.id),
                                disabled: it.locked,
                                hint: it.locked ? "Locked" : undefined,
                              },
                              {
                                label: "Duplicate",
                                icon: Copy,
                                onSelect: () => duplicate.mutate(it.id),
                                disabled: duplicate.isPending,
                              },
                              "separator",
                              {
                                label: "Archive",
                                icon: Archive,
                                destructive: true,
                                onSelect: () => setArchiving(it),
                              },
                            ]
                      }
                    />
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPage={setPage}
        noun="questions"
      />

      <Dialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        <DialogContent
          className="max-h-[90vh] max-w-2xl overflow-y-auto"
          title={editing === "new" ? "New question" : "Edit question"}
        >
          {editing === "new" && topics.data && (
            <QuestionForm
              topics={topics.data}
              onCancel={() => setEditing(null)}
              onSubmit={async (v) => {
                await save.mutateAsync(v);
              }}
            />
          )}
          {editing && editing !== "new" && detail.isPending && (
            <Skeleton className="h-64 w-full" />
          )}
          {editing && editing !== "new" && detail.isError && (
            <p className="text-destructive text-sm">{detail.error.message}</p>
          )}
          {editing && editing !== "new" && detail.data && topics.data && (
            <QuestionForm
              key={detail.data.id}
              topics={topics.data}
              initial={{
                topicId: detail.data.topicId,
                type: detail.data.type,
                difficulty: detail.data.difficulty,
                body: detail.data.body,
                defaultMarks: detail.data.defaultMarks,
                options: detail.data.options.map((o) => ({
                  body: o.body,
                  isCorrect: o.isCorrect,
                })),
              }}
              onCancel={() => setEditing(null)}
              onSubmit={async (v) => {
                await save.mutateAsync(v);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={archiving !== null}
        onOpenChange={(o) => !o && setArchiving(null)}
      >
        <DialogContent
          title="Archive question?"
          description="It moves to Archived, where you can restore it any time. Exams that already use it keep their copy."
        >
          <p className="line-clamp-3 text-sm">{archiving?.body}</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setArchiving(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={archive.isPending}
              onClick={() => archiving && archive.mutate(archiving.id)}
            >
              Archive
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <QuestionPreviewDialog
        questionId={previewing}
        onClose={() => setPreviewing(null)}
      />
      <TopicsDialog open={topicsOpen} onOpenChange={setTopicsOpen} />
      <QuestionImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </>
  );
}
