"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { EmptyState } from "@/components/ui/blocks";
import { attemptsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { AttemptSession } from "./workspace/attempt-session";

/** Loads an attempt and hands it to the live exam workspace. */
export function ExamWorkspace({ attemptId }: { attemptId: string }) {
  const attemptQuery = useQuery({
    queryKey: qk.attempts.detail(attemptId),
    queryFn: () => attemptsApi.get(attemptId),
    refetchOnWindowFocus: false,
  });

  if (attemptQuery.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (attemptQuery.isError || !attemptQuery.data) {
    return (
      <EmptyState
        title="Could not open attempt"
        text={attemptQuery.error?.message ?? "Attempt not found"}
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to home</Link>
          </Button>
        }
      />
    );
  }
  // Keyed by id so a different attempt (e.g. sandbox reset) starts a fresh session.
  return (
    <AttemptSession key={attemptQuery.data.id} attempt={attemptQuery.data} />
  );
}
