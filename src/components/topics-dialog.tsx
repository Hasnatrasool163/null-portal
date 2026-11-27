"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton, Spinner } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { Topic } from "@/shared/schemas/question";

export function useTopics() {
  return useQuery({
    queryKey: ["topics"],
    queryFn: () => api<Topic[]>("/api/topics"),
  });
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

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
  const qc = useQueryClient();
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

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["topics"] });
    qc.invalidateQueries({ queryKey: ["questions"] });
  };
  const create = useMutation({
    mutationFn: (n: string) =>
      api("/api/topics", { method: "POST", body: { name: n } }),
    onSuccess: () => {
      toast.success(`Topic "${trimmed}" added`);
      setName("");
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const rename = useMutation({
    mutationFn: (v: { id: string; name: string }) =>
      api(`/api/topics/${v.id}`, { method: "PATCH", body: { name: v.name } }),
    onSuccess: () => {
      toast.success("Topic renamed");
      setEditing(null);
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/topics/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Topic deleted");
      setConfirmDelete(null);
      refresh();
    },
    onError: (e) => toast.error(e.message),
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
          {list.map((t) => {
            const inUse = t.questionCount + t.archivedCount > 0;
            const isEditing = editing?.id === t.id;
            const isConfirming = confirmDelete === t.id;
            const nextName = editing?.name.trim() ?? "";
            const canSave =
              isEditing &&
              nextName.length > 0 &&
              nextName !== t.name &&
              !list.some(
                (o) =>
                  o.id !== t.id &&
                  o.name.toLowerCase() === nextName.toLowerCase(),
              );

            return (
              <li
                key={t.id}
                className={cn(
                  "flex min-h-14 items-center gap-3 px-3 py-2",
                  isConfirming && "bg-destructive/5",
                )}
              >
                {isEditing ? (
                  <form
                    className="flex flex-1 items-center gap-1.5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (canSave) rename.mutate({ id: t.id, name: nextName });
                    }}
                  >
                    <Input
                      autoFocus
                      aria-label={`New name for ${t.name}`}
                      className="h-9"
                      maxLength={60}
                      value={editing.name}
                      onChange={(e) =>
                        setEditing({ id: t.id, name: e.target.value })
                      }
                      onKeyDown={(e) =>
                        e.key === "Escape" &&
                        (e.stopPropagation(), setEditing(null))
                      }
                    />
                    <Button
                      type="submit"
                      size="icon"
                      aria-label="Save name"
                      disabled={!canSave || rename.isPending}
                    >
                      {rename.isPending ? (
                        <Spinner />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Cancel"
                      onClick={() => setEditing(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </form>
                ) : isConfirming ? (
                  <>
                    <p className="min-w-0 flex-1 text-sm">
                      Delete <span className="font-medium">{t.name}</span>?
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmDelete(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(t.id)}
                    >
                      {remove.isPending && <Spinner />}
                      Delete
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {usage(t)}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Rename ${t.name}`}
                      tooltip="Rename"
                      onClick={() => {
                        setConfirmDelete(null);
                        setEditing({ id: t.id, name: t.name });
                      }}
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
                      onClick={() => {
                        setEditing(null);
                        setConfirmDelete(t.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
