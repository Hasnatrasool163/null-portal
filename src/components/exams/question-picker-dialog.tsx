"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { UnderlineTabs } from "@/components/ui/underline-tabs";
import { useTopics } from "@/components/questions/topics-dialog";
import { plural } from "@/lib/format";
import type { QuestionListItem } from "@/shared/schemas/question";
import { ChooseQuestionsPanel } from "./question-picker/choose-questions-panel";
import { DrawRulesPanel } from "./question-picker/draw-rules-panel";
import { DrawnQuestionsPreview } from "./question-picker/drawn-questions-preview";
import { useBankSelection } from "./question-picker/use-bank-selection";
import { useRandomDraw } from "./question-picker/use-random-draw";

type Mode = "choose" | "random";

/**
 * Add questions to an exam, two ways:
 * - Choose: filter the bank (topic, difficulty, type, text), tick many, add in one go.
 * - Random by rules (blueprint): "5 easy from Topic A + 3 hard", drawn server-side,
 *   previewed, then added. Never re-picks a question already in the exam.
 *
 * Both modes' state lives here (via hooks) so switching tabs keeps it.
 */
export function QuestionPickerDialog({
  open,
  onOpenChange,
  assignedIds,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  assignedIds: Set<string>;
  onAdd: (items: QuestionListItem[]) => void;
}) {
  const topics = useTopics();
  const topicList = topics.data ?? [];
  const [mode, setMode] = useState<Mode>("choose");
  const sel = useBankSelection(assignedIds, open && mode === "choose");
  const rd = useRandomDraw(assignedIds);

  function close(o: boolean) {
    if (!o) {
      sel.clear();
      rd.setDrawn(null);
    }
    onOpenChange(o);
  }
  function commit(items: QuestionListItem[]) {
    onAdd(items);
    toast.success(
      `${plural(items.length, "question")} added. Save the question set to keep them.`,
    );
    close(false);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        className="max-w-3xl"
        title="Add questions"
        description="Pick questions yourself, or draw them at random by topic and difficulty."
      >
        <div className="space-y-4">
          <UnderlineTabs
            label="How to add questions"
            value={mode}
            onChange={(m) => setMode(m)}
            tabs={[
              { id: "choose", label: "Choose questions" },
              { id: "random", label: "Random by rules" },
            ]}
          />

          {mode === "choose" ? (
            <ChooseQuestionsPanel
              sel={sel}
              assignedIds={assignedIds}
              topics={topicList}
              onCancel={() => close(false)}
              onCommit={commit}
            />
          ) : rd.drawn ? (
            <DrawnQuestionsPreview
              drawn={rd.drawn}
              drawing={rd.draw.isPending}
              onEditRules={() => rd.setDrawn(null)}
              onDrawAgain={() => rd.draw.mutate()}
              onCommit={commit}
            />
          ) : (
            <DrawRulesPanel
              rd={rd}
              topics={topicList}
              onCancel={() => close(false)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
