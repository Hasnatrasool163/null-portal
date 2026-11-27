"use client";
import { AlertTriangle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import type { AttemptQuestionPublic } from "@/shared/schemas/attempt";
import {
  isAnswered,
  type AnswerCounts,
  type DraftAnswer,
} from "./draft-answer";

/** Pre-submit overview: counts, per-question status and the submit button. */
export function ReviewPanel({
  questions,
  drafts,
  counts,
  onOpenQuestion,
  onBack,
  onSubmit,
}: {
  questions: AttemptQuestionPublic[];
  drafts: Record<string, DraftAnswer>;
  counts: AnswerCounts;
  onOpenQuestion: (index: number) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Review before submitting</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border p-3">
            <p className="text-muted-foreground text-xs">Answered</p>
            <p className="text-2xl font-semibold">{counts.answered}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-muted-foreground text-xs">Unanswered</p>
            <p className="text-2xl font-semibold">{counts.unanswered}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-muted-foreground text-xs">Flagged for review</p>
            <p className="text-2xl font-semibold">{counts.flagged}</p>
          </div>
        </div>

        {counts.unanswered > 0 && (
          <p className="text-warning flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            You still have {counts.unanswered} unanswered question(s).
          </p>
        )}

        <ul className="divide-y rounded-md border">
          {questions.map((q, i) => {
            const d = drafts[q.id];
            const done = isAnswered(d);
            return (
              <li
                key={q.id}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left hover:underline"
                  onClick={() => onOpenQuestion(i)}
                >
                  <span className="font-medium">Q{i + 1}.</span> {q.body}
                </button>
                <span className="flex shrink-0 items-center gap-1.5">
                  {d?.markedForReview && (
                    <Badge className="bg-warning/15 text-warning">Flagged</Badge>
                  )}
                  <Badge
                    className={
                      done
                        ? "bg-success/15 text-success"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {done ? "Answered" : "Unanswered"}
                  </Badge>
                </span>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap justify-between gap-2 pt-2">
          <Button variant="outline" onClick={onBack}>
            Back to questions
          </Button>
          <Button onClick={onSubmit}>
            <Send className="h-4 w-4" />
            Submit exam
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
