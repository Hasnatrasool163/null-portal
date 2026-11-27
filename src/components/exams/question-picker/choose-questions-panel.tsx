"use client";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import type { QuestionListItem } from "@/shared/schemas/question";
import { QuestionFilterSelects } from "./question-filter-selects";
import { QuestionMeta } from "./question-meta";
import { BANK_PAGE_SIZE, type BankSelection } from "./use-bank-selection";

/** "Choose questions" mode: filter the bank, tick many, add in one go. */
export function ChooseQuestionsPanel({
  sel,
  assignedIds,
  topics,
  onCancel,
  onCommit,
}: {
  sel: BankSelection;
  assignedIds: Set<string>;
  topics: { id: string; name: string }[];
  onCancel: () => void;
  onCommit: (items: QuestionListItem[]) => void;
}) {
  const { bank, pageItems, selected } = sel;
  return (
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
            value={sel.search}
            onChange={(e) => sel.setSearch(e.target.value)}
          />
        </div>
        <QuestionFilterSelects
          value={sel.filters}
          topics={topics}
          onChange={sel.setFilters}
        />
      </div>

      <div className="overflow-hidden rounded-md border">
        <div className="bg-muted/40 flex items-center gap-3 border-b px-3 py-2 text-xs">
          <input
            type="checkbox"
            className="choice"
            checked={sel.allOnPage}
            disabled={sel.selectable.length === 0}
            onChange={sel.togglePage}
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
          <p className="text-destructive p-4 text-sm">{bank.error.message}</p>
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
                      added ? "opacity-55" : "hover:bg-muted/40 cursor-pointer",
                      on && "bg-accent/50",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="choice mt-0.5"
                      checked={added || on}
                      disabled={added}
                      onChange={() => sel.toggle(q)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-medium">
                        {q.body}
                      </span>
                      <QuestionMeta q={q} />
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
        page={sel.page}
        pageSize={BANK_PAGE_SIZE}
        total={bank.data?.total ?? 0}
        onPage={sel.setPage}
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
              onClick={sel.clear}
            >
              Clear
            </button>
          )}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            disabled={selected.size === 0}
            onClick={() => onCommit([...selected.values()])}
          >
            <Plus className="h-4 w-4" />
            {selected.size
              ? `Add ${selected.size} question${selected.size === 1 ? "" : "s"}`
              : "Add questions"}
          </Button>
        </div>
      </div>
    </>
  );
}
