"use client";
import { Dices, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { QuestionFilterSelects } from "./question-filter-selects";
import type { RandomDraw } from "./use-random-draw";

/** "Random by rules" mode, before drawing: edit the blueprint rules. */
export function DrawRulesPanel({
  rd,
  topics,
  onCancel,
}: {
  rd: RandomDraw;
  topics: { id: string; name: string }[];
  onCancel: () => void;
}) {
  const { rules, ruleErrors, draw } = rd;
  return (
    <>
      <p className="text-muted-foreground text-sm">
        Each rule picks questions at random from your bank, e.g. 5 easy from one
        topic plus 3 hard. Questions already in this exam are skipped.
      </p>
      <ol className="space-y-2">
        {rules.map((r, i) => (
          <li
            key={r.key}
            className="grid items-start gap-2 sm:grid-cols-[5.5rem_repeat(3,minmax(0,1fr))_auto]"
          >
            <div>
              <Input
                type="number"
                min={1}
                max={50}
                inputMode="numeric"
                aria-label={`Rule ${i + 1}: number of questions`}
                aria-invalid={!!ruleErrors[i]}
                value={r.count}
                onChange={(e) =>
                  rd.updateRule(r.key, { count: e.target.value })
                }
              />
              {ruleErrors[i] && (
                <p className="text-destructive mt-1 text-xs">
                  Enter {ruleErrors[i]}
                </p>
              )}
            </div>
            <QuestionFilterSelects
              value={r}
              topics={topics}
              onChange={(f) => rd.updateRule(r.key, f)}
            />
            <Button
              variant="ghost"
              size="icon"
              tooltip="Remove rule"
              aria-label={`Remove rule ${i + 1}`}
              disabled={rules.length === 1}
              onClick={() => rd.removeRule(r.key)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ol>
      <Button
        variant="outline"
        size="sm"
        disabled={rules.length >= 10}
        onClick={rd.addRule}
      >
        <Plus className="h-4 w-4" />
        Add rule
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-muted-foreground text-sm">
          <span className="text-foreground font-medium tabular-nums">
            {rd.rulesValid ? rd.wanted : "–"}
          </span>{" "}
          questions requested
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            disabled={!rd.rulesValid || draw.isPending}
            onClick={() => draw.mutate()}
          >
            {draw.isPending ? <Spinner /> : <Dices className="h-4 w-4" />}
            Draw questions
          </Button>
        </div>
      </div>
    </>
  );
}
