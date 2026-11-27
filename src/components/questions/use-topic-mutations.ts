"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { topicsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";

/**
 * Add / rename / delete a topic. Questions are refreshed too, since they show
 * their topic's name.
 */
export function useTopicMutations({
  onCreated,
  onRenamed,
  onRemoved,
}: {
  onCreated: () => void;
  onRenamed: () => void;
  onRemoved: () => void;
}) {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: qk.topics });
    qc.invalidateQueries({ queryKey: qk.questions.all });
  };

  const create = useMutation({
    mutationFn: topicsApi.create,
    onSuccess: (_, name) => {
      toast.success(`Topic "${name}" added`);
      onCreated();
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const rename = useMutation({
    mutationFn: (v: { id: string; name: string }) =>
      topicsApi.rename(v.id, v.name),
    onSuccess: () => {
      toast.success("Topic renamed");
      onRenamed();
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: topicsApi.remove,
    onSuccess: () => {
      toast.success("Topic deleted");
      onRemoved();
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  return { create, rename, remove };
}
