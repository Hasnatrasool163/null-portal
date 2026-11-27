"use client";
import { useState } from "react";
import { FileUp, Plus, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/misc";
import { EmptyState, PageHeader } from "@/components/ui/blocks";
import { QuestionImportDialog } from "@/components/questions/question-import-dialog";
import { QuestionPreviewDialog } from "@/components/questions/question-preview-dialog";
import { TopicsDialog } from "@/components/questions/topics-dialog";
import type { QuestionListItem } from "@/shared/schemas/question";
import { ArchiveQuestionDialog } from "@/components/questions/archive-question-dialog";
import { QuestionEditorDialog } from "@/components/questions/question-editor-dialog";
import { QuestionFilters } from "@/components/questions/question-filters";
import { QuestionsTable } from "@/components/questions/questions-table";
import { useTopics } from "@/components/questions/use-topics";
import {
  QUESTIONS_PAGE_SIZE,
  useQuestionList,
} from "@/components/questions/use-question-list";
import {
  useQuestionMutations,
  type EditingQuestion,
} from "@/components/questions/use-question-mutations";

/** Question bank page: filters, the paged list, and the dialogs it opens. */
export function QuestionsManager() {
  const topics = useTopics();
  const state = useQuestionList();
  const { list, status, filtered } = state;
  const [editing, setEditing] = useState<EditingQuestion>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<QuestionListItem | null>(null);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const { save, archive, restore, duplicate } = useQuestionMutations({
    editing,
    onSaved: () => setEditing(null),
    onArchived: () => setArchiving(null),
    onDuplicated: setEditing,
  });

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

      <QuestionFilters state={state} topics={topics.data} />

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
        <QuestionsTable
          items={list.data.items}
          status={status}
          restoringId={restore.isPending ? restore.variables : undefined}
          duplicatePending={duplicate.isPending}
          onPreview={setPreviewing}
          onEdit={setEditing}
          onDuplicate={(id) => duplicate.mutate(id)}
          onArchive={setArchiving}
          onRestore={(id) => restore.mutate(id)}
        />
      )}

      <Pagination
        page={state.page}
        pageSize={QUESTIONS_PAGE_SIZE}
        total={list.data?.total ?? 0}
        onPage={state.setPage}
        noun="questions"
      />

      <QuestionEditorDialog
        editing={editing}
        topics={topics.data}
        onClose={() => setEditing(null)}
        onSubmit={async (v) => {
          await save.mutateAsync(v);
        }}
      />
      <ArchiveQuestionDialog
        question={archiving}
        pending={archive.isPending}
        onConfirm={(id) => archive.mutate(id)}
        onClose={() => setArchiving(null)}
      />
      <QuestionPreviewDialog
        questionId={previewing}
        onClose={() => setPreviewing(null)}
      />
      <TopicsDialog open={topicsOpen} onOpenChange={setTopicsOpen} />
      <QuestionImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </>
  );
}
