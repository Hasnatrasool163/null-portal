"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { api } from "@/lib/api-client";
import type { Topic } from "@/shared/schemas/question";

export function useTopics() {
  return useQuery({
    queryKey: ["topics"],
    queryFn: () => api<Topic[]>("/api/topics"),
  });
}

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
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["topics"] });
    qc.invalidateQueries({ queryKey: ["questions"] });
  };
  const create = useMutation({
    mutationFn: (n: string) =>
      api("/api/topics", { method: "POST", body: { name: n } }),
    onSuccess: () => {
      setName("");
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const rename = useMutation({
    mutationFn: (v: { id: string; name: string }) =>
      api(`/api/topics/${v.id}`, { method: "PATCH", body: { name: v.name } }),
    onSuccess: () => {
      setEditing(null);
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/topics/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Topic deleted");
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Topics"
        description="Group your questions by topic. A topic can be deleted once it has no questions."
      >
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) create.mutate(name.trim());
          }}
        >
          <Input
            aria-label="New topic name"
            placeholder="New topic name"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" disabled={create.isPending || !name.trim()}>
            Add
          </Button>
        </form>
        <ul className="mt-4 max-h-72 space-y-1 overflow-y-auto">
          {topics.isPending && <Skeleton className="h-10 w-full" />}
          {topics.isError && (
            <li className="text-destructive text-sm">{topics.error.message}</li>
          )}
          {topics.data?.length === 0 && (
            <li className="text-muted-foreground text-sm">
              No topics yet. Add your first one above.
            </li>
          )}
          {topics.data?.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              {editing?.id === t.id ? (
                <>
                  <Input
                    aria-label={`Rename ${t.name}`}
                    className="h-8"
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ id: t.id, name: e.target.value })
                    }
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Save name"
                    onClick={() => rename.mutate(editing)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Cancel rename"
                    onClick={() => setEditing(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm">
                    {t.name}{" "}
                    <span className="text-muted-foreground">
                      ({t.questionCount})
                    </span>
                  </span>
                  <span className="flex">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Rename ${t.name}`}
                      onClick={() => setEditing({ id: t.id, name: t.name })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Delete ${t.name}`}
                      onClick={() => remove.mutate(t.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
