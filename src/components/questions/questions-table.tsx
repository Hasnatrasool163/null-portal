"use client";
import { Archive, ArchiveRestore, Copy, Eye, Lock, Pencil } from "lucide-react";
import { Badge, Spinner } from "@/components/ui/misc";
import { RowMenu, type RowMenuItem } from "@/components/ui/row-menu";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  DIFFICULTY_LABEL,
  TYPE_LABEL,
  type QuestionListItem,
} from "@/shared/schemas/question";
import type { QuestionStatus } from "@/components/questions/use-question-list";

/** One page of the question bank, with per-row actions for the current status tab. */
export function QuestionsTable({
  items,
  status,
  restoringId,
  duplicatePending,
  onPreview,
  onEdit,
  onDuplicate,
  onArchive,
  onRestore,
}: {
  items: QuestionListItem[];
  status: QuestionStatus;
  /** Row whose restore is in flight; it shows a spinner instead of its menu. */
  restoringId: string | undefined;
  duplicatePending: boolean;
  onPreview: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onArchive: (item: QuestionListItem) => void;
  onRestore: (id: string) => void;
}) {
  const menuItems = (it: QuestionListItem): RowMenuItem[] =>
    status === "archived"
      ? [
          {
            label: "Preview",
            icon: Eye,
            onSelect: () => onPreview(it.id),
          },
          {
            label: "Restore",
            icon: ArchiveRestore,
            onSelect: () => onRestore(it.id),
          },
        ]
      : [
          {
            label: "Preview",
            icon: Eye,
            onSelect: () => onPreview(it.id),
          },
          {
            label: "Edit",
            icon: Pencil,
            onSelect: () => onEdit(it.id),
            disabled: it.locked,
            hint: it.locked ? "Locked" : undefined,
          },
          {
            label: "Duplicate",
            icon: Copy,
            onSelect: () => onDuplicate(it.id),
            disabled: duplicatePending,
          },
          "separator",
          {
            label: "Archive",
            icon: Archive,
            destructive: true,
            onSelect: () => onArchive(it),
          },
        ];

  return (
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
        {items.map((it) => (
          <TR key={it.id}>
            <TD className="max-w-sm">
              <p className="line-clamp-2 font-medium">{it.body}</p>
              {it.locked && (
                <span className="text-muted-foreground mt-0.5 inline-flex items-center gap-1 text-xs">
                  <Lock className="h-3 w-3" /> In published exam (duplicate to
                  edit)
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
              {restoringId === it.id ? (
                <span className="inline-flex h-8 w-8 items-center justify-center">
                  <Spinner />
                </span>
              ) : (
                <RowMenu
                  label="Actions for this question"
                  items={menuItems(it)}
                />
              )}
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
