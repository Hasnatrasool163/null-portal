"use client";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dices, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, fieldClass } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton, Spinner } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { UnderlineTabs } from "@/components/ui/underline-tabs";
import { useTopics } from "@/components/topics-dialog";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  QUESTION_TYPES,
  TYPE_LABEL,
  type Difficulty,
  type QuestionList,
  type QuestionListItem,
  type QuestionType,
} from "@/shared/schemas/question";

type Mode = "choose" | "random";
type Filters = { topicId: string; difficulty: string; type: string };
type Rule = {
  key: number;
  count: string;
  topicId: string;
  difficulty: string;
  type: string;
};
type DrawResult = {
  items: QuestionListItem[];
  results: { wanted: number; got: number }[];
};

const PAGE_SIZE = 20;

function Meta({ q }: { q: QuestionListItem }) {
  return (
    <p className="text-muted-foreground mt-0.5 text-xs">
      {q.topicName} · {TYPE_LABEL[q.type]} · {DIFFICULTY_LABEL[q.difficulty]} ·{" "}
      {q.defaultMarks} {q.defaultMarks === 1 ? "mark" : "marks"}
    </p>
  );
}

function FilterSelects({
  value,
  onChange,
  topics,
  compact,
}: {
  value: Filters;
  onChange: (f: Filters) => void;
  topics: { id: string; name: string }[];
  compact?: boolean;
}) {
  const cls = compact ? "h-9" : undefined;
  return (
    <>
      <Select
        aria-label="Topic"
        className={cls}
        value={value.topicId}
        onChange={(e) => onChange({ ...value, topicId: e.target.value })}
      >
        <option value="">Any topic</option>
        {topics.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Difficulty"
        className={cls}
        value={value.difficulty}
        onChange={(e) => onChange({ ...value, difficulty: e.target.value })}
      >
        <option value="">Any difficulty</option>
        {DIFFICULTIES.map((d) => (
          <option key={d} value={d}>
            {DIFFICULTY_LABEL[d]}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Question type"
        className={cls}
        value={value.type}
        onChange={(e) => onChange({ ...value, type: e.target.value })}
      >
        <option value="">Any type</option>
        {QUESTION_TYPES.map((t) => (
          <option key={t} value={t}>
            {TYPE_LABEL[t]}
          </option>
        ))}
      </Select>
    </>
  );
}

/**
 * Add questions to an exam, two ways:
 * - Choose: filter the bank (topic, difficulty, type, text), tick many, add in one go.
 * - Random by rules (blueprint): "5 easy from Topic A + 3 hard", drawn server-side,
 *   previewed, then added. Never re-picks a question already in the exam.
 */
export function QuestionPickerDialog({
  open,
  onOpenChange,
  assignedIds,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  assignedIds: Set<string>;
  onAdd: (items: QuestionListItem[]) => void;
}) {
  const topics = useTopics();
  const topicList = topics.data ?? [];
  const [mode, setMode] = useState<Mode>("choose");

  // Choose mode
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({
    topicId: "",
    difficulty: "",
    type: "",
  });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Map<string, QuestionListItem>>(
    new Map(),
  );

  const bank = useQuery({
    queryKey: ["bank-picker", search, filters, page],
    queryFn: () => {
      const p = new URLSearchParams({
        pageSize: String(PAGE_SIZE),
        page: String(page),
      });
      if (search.trim()) p.set("q", search.trim());
      if (filters.topicId) p.set("topicId", filters.topicId);
      if (filters.difficulty) p.set("difficulty", filters.difficulty);
      if (filters.type) p.set("type", filters.type);
      return api<QuestionList>(`/api/questions?${p}`);
    },
    enabled: open && mode === "choose",
    placeholderData: (prev) => prev,
  });

  // Random mode
  const [rules, setRules] = useState<Rule[]>([
    { key: 1, count: "5", topicId: "", difficulty: "", type: "" },
  ]);
  const [drawn, setDrawn] = useState<DrawResult | null>(null);
  const ruleErrors = rules.map((r) => {
    const n = Number(r.count);
    return !Number.isInteger(n) || n < 1 || n > 50 ? "1–50" : "";
  });
  const rulesValid = ruleErrors.every((e) => !e);
  const wanted = rules.reduce((s, r) => s + (Number(r.count) || 0), 0);

  const draw = useMutation({
    mutationFn: () =>
      api<DrawResult>("/api/questions/draw", {
        method: "POST",
        body: {
          rules: rules.map((r) => ({
            count: Number(r.count),
            topicId: r.topicId || undefined,
            difficulty: (r.difficulty || undefined) as Difficulty | undefined,
            type: (r.type || undefined) as QuestionType | undefined,
          })),
          excludeIds: [...assignedIds],
        },
      }),
    onSuccess: setDrawn,
    onError: (e) => toast.error(e.message),
  });

  function reset() {
    setSelected(new Map());
    setDrawn(null);
  }
  function close(o: boolean) {
    if (!o) reset();
    onOpenChange(o);
  }
  function commit(items: QuestionListItem[]) {
    onAdd(items);
    toast.success(
      `${items.length} question${items.length === 1 ? "" : "s"} added. Save the question set to keep them.`,
    );
    close(false);
  }

  const pageItems = bank.data?.items ?? [];
  const selectable = pageItems.filter((q) => !assignedIds.has(q.id));
  const allOnPage =
    selectable.length > 0 && selectable.every((q) => selected.has(q.id));
  const toggle = (q: QuestionListItem) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(q.id)) next.delete(q.id);
      else next.set(q.id, q);
      return next;
    });
  const togglePage = () =>
    setSelected((prev) => {
      const next = new Map(prev);
      selectable.forEach((q) =>
        allOnPage ? next.delete(q.id) : next.set(q.id, q),
      );
      return next;
    });

  const shortfall = drawn?.results.some((r) => r.got < r.wanted);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        className="max-w-3xl"
        title="Add questions"
        description="Pick questions yourself, or draw them at random by topic and difficulty."
      >
        <div className="space-y-4">
          <UnderlineTabs
            label="How to add questions"
            value={mode}
            onChange={(m) => setMode(m)}
            tabs={[
              { id: "choose", label: "Choose questions" },
              { id: "random", label: "Random by rules" },
            ]}
          />

          {mode === "choose" ? (
            <>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
                <div className="relative">
                  <Search
                    className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    className={cn(fieldClass, "pl-9")}
                    placeholder="Search questions"
                    aria-label="Search question bank"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <FilterSelects
                  value={filters}
                  topics={topicList}
                  onChange={(f) => {
                    setFilters(f);
                    setPage(1);
                  }}
                />
              </div>

              <div className="overflow-hidden rounded-md border">
                <div className="bg-muted/40 flex items-center gap-3 border-b px-3 py-2 text-xs">
                  <input
                    type="checkbox"
                    className="choice"
                    checked={allOnPage}
                    disabled={selectable.length === 0}
                    onChange={togglePage}
                    aria-label="Select all on this page"
                  />
                  <span className="text-muted-foreground">
                    {bank.data ? `${bank.data.total} matching` : "Loading…"}
                  </span>
                </div>
                {bank.isPending ? (
                  <div className="space-y-2 p-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : bank.isError ? (
                  <p className="text-destructive p-4 text-sm">
                    {bank.error.message}
                  </p>
                ) : pageItems.length === 0 ? (
                  <p className="text-muted-foreground p-6 text-center text-sm">
                    No questions match these filters.
                  </p>
                ) : (
                  <ul className="max-h-[42vh] divide-y overflow-y-auto">
                    {pageItems.map((q) => {
                      const added = assignedIds.has(q.id);
                      const on = selected.has(q.id);
                      return (
                        <li key={q.id}>
                          <label
                            className={cn(
                              "flex items-start gap-3 px-3 py-2.5 transition-colors",
                              added
                                ? "opacity-55"
                                : "hover:bg-muted/40 cursor-pointer",
                              on && "bg-accent/50",
                            )}
                          >
                            <input
                              type="checkbox"
                              className="choice mt-0.5"
                              checked={added || on}
                              disabled={added}
                              onChange={() => toggle(q)}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-2 text-sm font-medium">
                                {q.body}
                              </span>
                              <Meta q={q} />
                            </span>
                            {added && (
                              <span className="text-muted-foreground text-xs">
                                In exam
                              </span>
                            )}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={bank.data?.total ?? 0}
                onPage={setPage}
                noun="questions"
              />

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <p className="text-muted-foreground text-sm">
                  <span className="text-foreground font-medium tabular-nums">
                    {selected.size}
                  </span>{" "}
                  selected
                  {selected.size > 0 && (
                    <button
                      type="button"
                      className="text-foreground ml-2 text-xs font-medium hover:underline"
                      onClick={() => setSelected(new Map())}
                    >
                      Clear
                    </button>
                  )}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => close(false)}>
                    Cancel
                  </Button>
                  <Button
                    disabled={selected.size === 0}
                    onClick={() => commit([...selected.values()])}
                  >
                    <Plus className="h-4 w-4" />
                    {selected.size
                      ? `Add ${selected.size} question${selected.size === 1 ? "" : "s"}`
                      : "Add questions"}
                  </Button>
                </div>
              </div>
            </>
          ) : drawn ? (
            <>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Drew {drawn.items.length} of{" "}
                  {drawn.results.reduce((s, r) => s + r.wanted, 0)} questions
                </p>
                {shortfall && (
                  <p className="text-muted-foreground text-xs">
                    Some rules had fewer matching questions than requested, so
                    they drew everything available.
                  </p>
                )}
              </div>
              {drawn.items.length === 0 ? (
                <p className="text-muted-foreground rounded-md border p-6 text-center text-sm">
                  No unused questions match these rules.
                </p>
              ) : (
                <ul className="max-h-[46vh] divide-y overflow-y-auto rounded-md border">
                  {drawn.items.map((q, i) => (
                    <li
                      key={q.id}
                      className="flex items-start gap-3 px-3 py-2.5"
                    >
                      <span className="text-muted-foreground w-5 shrink-0 pt-px text-right text-xs tabular-nums">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-sm font-medium">
                          {q.body}
                        </span>
                        <Meta q={q} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <Button variant="ghost" onClick={() => setDrawn(null)}>
                  Edit rules
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={draw.isPending}
                    onClick={() => draw.mutate()}
                  >
                    {draw.isPending ? (
                      <Spinner />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                    Draw again
                  </Button>
                  <Button
                    disabled={drawn.items.length === 0}
                    onClick={() => commit(drawn.items)}
                  >
                    <Plus className="h-4 w-4" />
                    Add {drawn.items.length} question
                    {drawn.items.length === 1 ? "" : "s"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-muted-foreground text-sm">
                Each rule picks questions at random from your bank, e.g. 5 easy
                from one topic plus 3 hard. Questions already in this exam are
                skipped.
              </p>
              <ol className="space-y-2">
                {rules.map((r, i) => (
                  <li
                    key={r.key}
                    className="grid items-start gap-2 sm:grid-cols-[5.5rem_repeat(3,minmax(0,1fr))_auto]"
                  >
                    <div>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        inputMode="numeric"
                        aria-label={`Rule ${i + 1}: number of questions`}
                        aria-invalid={!!ruleErrors[i]}
                        value={r.count}
                        onChange={(e) =>
                          setRules((prev) =>
                            prev.map((x) =>
                              x.key === r.key
                                ? { ...x, count: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                      {ruleErrors[i] && (
                        <p className="text-destructive mt-1 text-xs">
                          Enter {ruleErrors[i]}
                        </p>
                      )}
                    </div>
                    <FilterSelects
                      value={r}
                      topics={topicList}
                      onChange={(f) =>
                        setRules((prev) =>
                          prev.map((x) =>
                            x.key === r.key ? { ...x, ...f } : x,
                          ),
                        )
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      tooltip="Remove rule"
                      aria-label={`Remove rule ${i + 1}`}
                      disabled={rules.length === 1}
                      onClick={() =>
                        setRules((prev) => prev.filter((x) => x.key !== r.key))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ol>
              <Button
                variant="outline"
                size="sm"
                disabled={rules.length >= 10}
                onClick={() =>
                  setRules((prev) => [
                    ...prev,
                    {
                      key: Date.now(),
                      count: "3",
                      topicId: "",
                      difficulty: "",
                      type: "",
                    },
                  ])
                }
              >
                <Plus className="h-4 w-4" />
                Add rule
              </Button>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <p className="text-muted-foreground text-sm">
                  <span className="text-foreground font-medium tabular-nums">
                    {rulesValid ? wanted : "–"}
                  </span>{" "}
                  questions requested
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => close(false)}>
                    Cancel
                  </Button>
                  <Button
                    disabled={!rulesValid || draw.isPending}
                    onClick={() => draw.mutate()}
                  >
                    {draw.isPending ? (
                      <Spinner />
                    ) : (
                      <Dices className="h-4 w-4" />
                    )}
                    Draw questions
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
