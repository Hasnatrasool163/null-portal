import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CandidateResultQuestion } from "@/shared/schemas/grading";

/** Choice question review: every option, marking the candidate's picks and the correct ones. */
export function OptionResults({
  question: q,
}: {
  question: CandidateResultQuestion;
}) {
  return (
    <ul className="divide-y rounded-md border">
      {q.options.map((opt) => {
        const picked = q.selectedOptionIds.includes(opt.id);
        const right = opt.isCorrect === true;
        const wrongPick = picked && opt.isCorrect === false;
        return (
          <li
            key={opt.id}
            className={cn(
              "flex items-center gap-3 px-3.5 py-2.5 text-sm",
              right && "bg-success/6",
              wrongPick && "bg-destructive/5",
            )}
          >
            <span
              className="flex h-4 w-4 shrink-0 items-center justify-center"
              aria-hidden="true"
            >
              {right ? (
                <Check className="text-success h-4 w-4" strokeWidth={2.75} />
              ) : wrongPick ? (
                <X className="text-destructive h-4 w-4" strokeWidth={2.75} />
              ) : (
                <span
                  className={cn(
                    "h-3 w-3 rounded-full border-[1.5px]",
                    picked
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/40",
                  )}
                />
              )}
            </span>
            <span className={cn("flex-1", right && "font-medium")}>
              {opt.body}
            </span>
            {picked && (
              <span className="text-muted-foreground text-xs">Your answer</span>
            )}
            {right && !picked && (
              <span className="text-success text-xs">Correct answer</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
