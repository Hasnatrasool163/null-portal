"use client";
import { useQuery } from "@tanstack/react-query";
import { topicsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";

/** The examiner's topics, with live and archived question counts. */
export function useTopics() {
  return useQuery({
    queryKey: qk.topics,
    queryFn: topicsApi.list,
  });
}
