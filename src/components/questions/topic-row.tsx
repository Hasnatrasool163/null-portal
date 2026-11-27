"use client";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Topic } from "@/shared/schemas/question";

function usage(t: Topic) {
  if (t.questionCount === 0 && t.archivedCount === 0) return "No questions";
  return [
    t.questionCount > 0 && plural(t.questionCount, "question"),
    t.archivedCount > 0 && `${t.archivedCount} archived`,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * One topic in the Topics dialog, in one of three modes: summary with
 * rename/delete buttons, inline rename form, or inline delete confirmation.
 */
export function TopicRow({
  topic: t,
  topics,
  editingName,
  confirming,
  renamePending,
  removePending,
  onEditingNameChange,
  onStartRename,
  onCancelRename,
  onRename,
  onStartDelete,
  onCancelDelete,
  onDelete,
}: {
  topic: Topic;
  /** All topics, to block renaming onto an existing name. */
  topics: Topic[];
  /** Draft name while this row is being renamed, otherwise null. */
  editingName: string | null;
  confirming: boolean;
  renamePending: boolean;
  removePending: boolean;
  onEditingNameChange: (name: string) => void;
  onStartRename: () => void;
  onCancelRename: () => void;
  onRename: (name: string) => void;
  onStartDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  const inUse = t.questionCount + t.archivedCount > 0;
  const isEditing = editingName !== null;
  const nextName = editingName?.trim() ?? "";
  const canSave =
    isEditing &&
    nextName.length > 0 &&
    nextName !== t.name &&
    !topics.some(
      (o) => o.id !== t.id && o.name.toLowerCase() === nextName.toLowerCase(),
    );

  return (
    <li
      className={cn(
        "flex min-h-14 items-center gap-3 px-3 py-2",
        confirming && "bg-destructive/5",
      )}
    >
      {isEditing ? (
        <form
          className="flex flex-1 items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSave) onRename(nextName);
          }}
        >
          <Input
            autoFocus
            aria-label={`New name for ${t.name}`}
            className="h-9"
            maxLength={60}
            value={editingName}
            onChange={(e) => onEditingNameChange(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Escape" && (e.stopPropagation(), onCancelRename())
            }
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Save name"
            disabled={!canSave || renamePending}
          >
            {renamePending ? <Spinner /> : <Check className="h-4 w-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Cancel"
            onClick={onCancelRename}
          >
            <X className="h-4 w-4" />
          </Button>
        </form>
      ) : confirming ? (
        <>
          <p className="min-w-0 flex-1 text-sm">
            Delete <span className="font-medium">{t.name}</span>?
          </p>
          <Button size="sm" variant="ghost" onClick={onCancelDelete}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={removePending}
            onClick={onDelete}
          >
            {removePending && <Spinner />}
            Delete
          </Button>
        </>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{t.name}</p>
            <p className="text-muted-foreground text-xs">{usage(t)}</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Rename ${t.name}`}
            tooltip="Rename"
            onClick={onStartRename}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="hover:text-destructive hover:bg-destructive/10"
            aria-label={`Delete ${t.name}`}
            tooltip={
              inUse
                ? `Can't delete: ${usage(t).toLowerCase()} still use this topic. Move them to another topic first, or rename it.`
                : "Delete"
            }
            disabled={inUse}
            onClick={onStartDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
    </li>
  );
}
