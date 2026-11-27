"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, Skeleton, Spinner } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { examsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useEnrollCandidates } from "./use-enrollment-mutations";

/** Search active candidate accounts and enroll the ticked ones. */
export function EnrollCandidatesDialog({
  examId,
  open,
  onOpenChange,
}: {
  examId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const candidates = useQuery({
    queryKey: qk.exams.candidateSearch(examId, search),
    queryFn: () => examsApi.searchCandidates(examId, search),
    enabled: open,
  });

  const enroll = useEnrollCandidates(examId, () => {
    setSelected(new Set());
    onOpenChange(false);
  });

  const toggle = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg"
        title="Enroll candidates"
        description="Select active candidate accounts to enroll in this exam."
      >
        <div className="space-y-3">
          <Input
            placeholder="Search by name or email..."
            aria-label="Search candidates"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {candidates.isPending ? (
            <Skeleton className="h-32 w-full" />
          ) : candidates.data?.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No matching active candidates.
            </p>
          ) : (
            <ul className="max-h-72 divide-y overflow-y-auto rounded-md border">
              {candidates.data?.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <label className="flex flex-1 cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      className="choice"
                      disabled={c.enrolled}
                      checked={c.enrolled || selected.has(c.id)}
                      onChange={(e) => toggle(c.id, e.target.checked)}
                    />
                    <span>
                      <span className="font-medium">{c.name}</span>{" "}
                      <span className="text-muted-foreground text-xs">
                        ({c.email})
                      </span>
                    </span>
                  </label>
                  {c.enrolled && <Badge>Enrolled</Badge>}
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={selected.size === 0 || enroll.isPending}
              onClick={() => enroll.mutate([...selected])}
            >
              {enroll.isPending && <Spinner />}
              Enroll ({selected.size})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
