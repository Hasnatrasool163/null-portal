"use client";
import { AlertTriangle } from "lucide-react";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { DIFFICULTY_LABEL, TYPE_LABEL } from "@/shared/schemas/question";
import type { QuestionAnalyticsItem } from "@/shared/schemas/secondary";

/** How each option was chosen; highlights the key and the most common wrong pick. */
function OptionDistribution({ q }: { q: QuestionAnalyticsItem }) {
  return (
    <ul className="space-y-1.5">
      {q.optionDistribution.map((o) => {
        const topWrong = !o.isCorrect && o.body === q.mostCommonWrong;
        return (
          <li key={o.optionId} className="text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className={`truncate ${o.isCorrect ? "text-success font-medium" : topWrong ? "text-destructive" : "text-muted-foreground"}`}>
                {o.isCorrect ? "✓ " : ""}
                {o.body}
              </span>
              <span className="text-muted-foreground shrink-0 tabular-nums">
                {o.percent}% · {o.count}
              </span>
            </div>
            <div className="bg-muted mt-0.5 h-1 overflow-hidden rounded-full" aria-hidden="true">
              <div
                className={`h-full ${o.isCorrect ? "bg-success" : topWrong ? "bg-destructive" : "bg-muted-foreground/40"}`}
                style={{ width: `${o.percent}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Per-question difficulty, credit, skip rate and answer distribution. */
export function QuestionAnalyticsTable({
  questions,
}: {
  questions: QuestionAnalyticsItem[];
}) {
  return (
    <Table>
      <THead>
        <TR>
          <TH>Question</TH>
          <TH>Difficulty</TH>
          <TH>Full credit</TH>
          <TH>Skipped</TH>
          <TH className="min-w-64">Answers chosen</TH>
        </TR>
      </THead>
      <TBody>
        {questions.map((q) => (
          <TR key={q.questionId}>
            <TD className="max-w-xs align-top">
              <p className="line-clamp-2 font-medium">
                <span className="text-muted-foreground font-normal">Q{q.position + 1}</span> {q.body}
              </p>
              <p className="text-muted-foreground text-xs">
                {q.topicName} · {TYPE_LABEL[q.type]} · {q.marks} pts
              </p>
            </TD>
            <TD className="align-top">
              <p className="text-sm">
                {DIFFICULTY_LABEL[q.declaredDifficulty]}
                {q.observedDifficulty && q.observedDifficulty !== q.declaredDifficulty && (
                  <span className="text-muted-foreground"> → {DIFFICULTY_LABEL[q.observedDifficulty]}</span>
                )}
              </p>
              {q.difficultyMismatch && (
                <p className="text-warning mt-0.5 inline-flex items-center gap-1 text-xs">
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  Plays harder/easier than set
                </p>
              )}
            </TD>
            <TD className="align-top">
              <p className="font-semibold tabular-nums">{q.percentCorrect}%</p>
              <div className="bg-muted mt-1 h-1 w-16 overflow-hidden rounded-full" aria-hidden="true">
                <div className="bg-primary h-full" style={{ width: `${q.percentCorrect}%` }} />
              </div>
              <p className="text-muted-foreground mt-1 text-xs">avg {q.avgScorePct}%</p>
            </TD>
            <TD className={`align-top tabular-nums ${q.skipRate >= 20 ? "text-warning font-medium" : ""}`}>
              {q.skipRate}%
            </TD>
            <TD className="align-top">
              {q.type === "WRITTEN" ? (
                <span className="text-muted-foreground text-xs">Written response</span>
              ) : (
                <OptionDistribution q={q} />
              )}
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
