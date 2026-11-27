"use client";
import { Button } from "@/components/ui/button";
import type { AttemptQuestionPublic } from "@/shared/schemas/attempt";

/** Radio (single choice) or checkbox (multiple choice) options with 1-9 key hints. */
export function ChoiceAnswerField({
  question,
  selectedOptionIds,
  onToggle,
  onClear,
}: {
  question: AttemptQuestionPublic;
  selectedOptionIds: number[];
  onToggle: (optionId: number) => void;
  onClear: () => void;
}) {
  const single = question.type === "MCQ_SINGLE";
  return (
    <fieldset className="space-y-2.5">
      <legend className="sr-only">Answer choices</legend>
      {question.options.map((opt, optIdx) => {
        const checked = selectedOptionIds.includes(opt.id);
        return (
          <label
            key={opt.id}
            className={`q-text flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-[background-color,border-color,box-shadow,transform] duration-150 motion-safe:active:scale-[0.995] ${
              checked
                ? "border-primary/70 bg-accent/50 shadow-elev-1"
                : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
            }`}
          >
            <input
              type={single ? "radio" : "checkbox"}
              name={`q-${question.id}`}
              className="choice"
              checked={checked}
              onChange={() => onToggle(opt.id)}
            />
            <span className="flex-1">{opt.body}</span>
            <kbd
              className={`hidden h-6 min-w-6 items-center justify-center rounded border px-1.5 font-mono text-[11px] sm:inline-flex ${
                checked
                  ? "border-primary/40 text-primary"
                  : "text-muted-foreground"
              }`}
              aria-hidden="true"
            >
              {optIdx + 1}
            </kbd>
          </label>
        );
      })}
      {single && selectedOptionIds.length > 0 && (
        <Button type="button" size="sm" variant="ghost" onClick={onClear}>
          Clear selection
        </Button>
      )}
    </fieldset>
  );
}
