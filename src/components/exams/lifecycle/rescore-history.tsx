import { formatShortDateTime, plural } from "@/lib/format";
import type { RescoreRun } from "@/lib/api";
import type { ExamDetail } from "@/shared/schemas/exam";

/** Past answer-key corrections, newest first. */
export function RescoreHistory({
  exam,
  runs,
}: {
  exam: ExamDetail;
  runs: RescoreRun[];
}) {
  const qLabel = (id: string) => {
    const x = exam.questions.find((y) => y.questionId === id);
    return x ? `Q${x.position + 1}` : "Question";
  };

  return (
    <div className="border-t">
      <p className="text-muted-foreground px-5 pt-4 pb-2 text-xs font-medium">
        History
      </p>
      <ul className="divide-y">
        {runs.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-start gap-x-4 gap-y-1 px-5 py-3 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {qLabel(r.questionId)} answer key updated
                <span className="text-muted-foreground font-normal">
                  {" "}
                  · {plural(r.changes.length, "answer")} re-marked
                </span>
              </p>
              <p className="text-muted-foreground">“{r.reason}”</p>
            </div>
            <p className="text-muted-foreground text-xs whitespace-nowrap">
              {formatShortDateTime(r.createdAt)}
              {r.rescoredBy && ` · ${r.rescoredBy}`}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
