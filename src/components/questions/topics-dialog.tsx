"use client";
import { useState } from "react";
import { Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton, Spinner } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TopicRow } from "@/components/questions/topic-row";
import { useTopics } from "@/components/questions/use-topics";
import { useTopicMutations } from "@/components/questions/use-topic-mutations";

// Re-exported: other screens (e.g. the exam question picker) import it from here.
export { useTopics };

/**
 * Topics: add, rename, delete. Renaming is the safe edit (questions follow the topic);
 * delete only unlocks for an empty topic (archived questions count, since past exams
 * may use them), and asks for confirmation inline.
 */
export function TopicsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const topics = useTopics();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const list = topics.data ?? [];
  const trimmed = name.trim();
  const duplicate = list.some(
    (t) => t.name.toLowerCase() === trimmed.toLowerCase(),
  );

  const { create, rename, remove } = useTopicMutations({
    onCreated: () => setName(""),
    onRenamed: () => setEditing(null),
    onRemoved: () => setConfirmDelete(null),
  });

  function close(o: boolean) {
    if (!o) {
      setEditing(null);
      setConfirmDelete(null);
      setName("");
    }
    onOpenChange(o);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        title="Topics"
        description="Topics group your questions. Renaming a topic updates every question in it."
      >
        <form
          className="space-y-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (trimmed && !duplicate) create.mutate(trimmed);
          }}
        >
          <div className="flex gap-2">
            <Input
              aria-label="New topic name"
              placeholder="New topic, e.g. Computer Networks"
              value={name}
              maxLength={60}
              aria-invalid={duplicate}
              onChange={(e) => setName(e.target.value)}
            />
            <Button
              type="submit"
              disabled={create.isPending || !trimmed || duplicate}
            >
              {create.isPending ? <Spinner /> : <Plus className="h-4 w-4" />}
              Add topic
            </Button>
          </div>
          {duplicate && (
            <p className="text-destructive text-xs">
              A topic with this name already exists.
            </p>
          )}
        </form>

        <div className="mt-5 mb-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">Your topics</span>
          {list.length > 0 && (
            <span className="text-muted-foreground tabular-nums">
              {list.length}
            </span>
          )}
        </div>
        <ul className="max-h-80 divide-y overflow-y-auto rounded-md border">
          {topics.isPending && (
            <li className="space-y-2 p-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </li>
          )}
          {topics.isError && (
            <li className="text-destructive p-3 text-sm">
              {topics.error.message}
            </li>
          )}
          {topics.data?.length === 0 && (
            <li className="text-muted-foreground flex flex-col items-center gap-1 p-6 text-center text-sm">
              <Tag className="h-5 w-5" aria-hidden="true" />
              No topics yet. Add your first one above.
            </li>
          )}
          {list.map((t) => (
            <TopicRow
              key={t.id}
              topic={t}
              topics={list}
              editingName={editing?.id === t.id ? editing.name : null}
              confirming={confirmDelete === t.id}
              renamePending={rename.isPending}
              removePending={remove.isPending}
              onEditingNameChange={(n) => setEditing({ id: t.id, name: n })}
              onStartRename={() => {
                setConfirmDelete(null);
                setEditing({ id: t.id, name: t.name });
              }}
              onCancelRename={() => setEditing(null)}
              onRename={(n) => rename.mutate({ id: t.id, name: n })}
              onStartDelete={() => {
                setEditing(null);
                setConfirmDelete(t.id);
              }}
              onCancelDelete={() => setConfirmDelete(null)}
              onDelete={() => remove.mutate(t.id)}
            />
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
