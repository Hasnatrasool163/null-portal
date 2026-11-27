"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import type { ExamDetail } from "@/shared/schemas/exam";
import { PanelHeader } from "./panel-header";
import { useAdminExamActions } from "./use-admin-exam-actions";

/** Admin-only oversight actions: close/cancel with a mandatory reason, and owner reassignment. */
export function AdminExamActions({ exam }: { exam: ExamDetail }) {
  const [reason, setReason] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const { examiners, close, reassign } = useAdminExamActions(exam.id, () =>
    setReason(""),
  );

  const open = exam.status !== "CLOSED";
  const reasonOk = reason.trim().length >= 5;
  return (
    <Card className="overflow-hidden">
      <PanelHeader
        title="Admin controls"
        description="Admins oversee exams but cannot edit questions, marks, grades or results."
      />
      <div className="space-y-6 p-5">
        {exam.status === "CLOSED" && exam.closeReason && (
          <div className="bg-muted/60 rounded-md px-3.5 py-3 text-sm">
            <p className="text-muted-foreground text-xs font-medium">
              {exam.cancelled ? "Cancelled" : "Closed"} by an administrator
            </p>
            <p>{exam.closeReason}</p>
          </div>
        )}

        {open && (
          <div className="space-y-2">
            <label htmlFor="admin-reason" className="text-sm font-medium">
              Close or cancel
            </label>
            <Textarea
              id="admin-reason"
              rows={2}
              placeholder="Reason for the record (at least 5 characters)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-muted-foreground text-xs">
                Logged in the audit trail with your name.
              </p>
              <div className="flex gap-2">
                {exam.status === "PUBLISHED" && (
                  <Button
                    variant="outline"
                    disabled={!reasonOk || close.isPending}
                    onClick={() => close.mutate({ action: "CLOSE", reason })}
                  >
                    Close exam
                  </Button>
                )}
                <Button
                  variant="destructive"
                  disabled={!reasonOk || close.isPending}
                  onClick={() => close.mutate({ action: "CANCEL", reason })}
                >
                  {close.isPending && <Spinner />}
                  Cancel exam
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2 border-t pt-5">
          <p className="text-sm font-medium">
            Owner{" "}
            <span className="text-muted-foreground font-normal">
              · {exam.ownerName}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <div className="min-w-56 flex-1">
              <Select
                aria-label="New owner"
                value={ownerId}
                placeholder="Reassign to…"
                onChange={(e) => setOwnerId(e.target.value)}
              >
                <option value="">Reassign to…</option>
                {(examiners.data?.users ?? [])
                  .filter((u) => u.isActive)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </Select>
            </div>
            <Button
              variant="outline"
              disabled={!ownerId || reassign.isPending}
              onClick={() => reassign.mutate(ownerId)}
            >
              {reassign.isPending && <Spinner />}
              Reassign
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
