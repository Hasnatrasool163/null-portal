"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/misc";
import { examsApi } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import type { AnnouncementItem } from "@/shared/schemas/monitoring";

/** Broadcast form (examiners only) plus the history of sent announcements. */
export function AnnouncementsCard({
  examId,
  announcements,
  readOnly,
}: {
  examId: string;
  announcements: AnnouncementItem[];
  readOnly: boolean;
}) {
  const qc = useQueryClient();
  const [message, setMessage] = useState("");

  const postAnn = useMutation({
    mutationFn: (msg: string) => examsApi.announce(examId, msg),
    onSuccess: () => {
      toast.success("Announcement broadcast to active candidates");
      setMessage("");
      qc.invalidateQueries({ queryKey: qk.exams.monitor(examId) });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="h-4 w-4" />
          Exam announcements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!readOnly && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (message.trim()) postAnn.mutate(message.trim());
            }}
          >
            <Input
              placeholder="Broadcast a clarification or update to active candidates..."
              aria-label="Announcement message"
              maxLength={1000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <Button type="submit" disabled={!message.trim() || postAnn.isPending}>
              {postAnn.isPending ? <Spinner /> : <Send className="h-4 w-4" />}
              Send
            </Button>
          </form>
        )}

        {announcements.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No announcements sent for this exam yet.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {announcements.map((ann) => (
              <li key={ann.id} className="p-3 text-sm">
                <p>{ann.message}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {ann.authorName} · {formatDateTime(ann.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
