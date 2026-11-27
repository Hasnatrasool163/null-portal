"use client";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { TYPE_LABEL } from "@/shared/schemas/question";
import type { QuestionSetItem } from "./use-question-set";

/** The exam's questions in order; editable marks and reorder/remove controls unless locked. */
export function QuestionSetTable({
  items,
  locked,
  onMove,
  onMarks,
  onRemove,
}: {
  items: QuestionSetItem[];
  locked: boolean;
  onMove: (idx: number, delta: -1 | 1) => void;
  onMarks: (idx: number, value: number) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <Table>
      <THead>
        <TR>
          <TH>#</TH>
          <TH>Question</TH>
          <TH>Topic</TH>
          <TH>Type</TH>
          <TH>Marks</TH>
          {!locked && <TH className="text-right">Order / Remove</TH>}
        </TR>
      </THead>
      <TBody>
        {items.map((it, idx) => (
          <TR key={it.questionId}>
            <TD className="text-muted-foreground">{idx + 1}</TD>
            <TD className="max-w-md">
              <p className="line-clamp-2 font-medium">{it.body}</p>
            </TD>
            <TD>{it.topicName}</TD>
            <TD>
              <Badge>{TYPE_LABEL[it.type]}</Badge>
            </TD>
            <TD>
              {locked ? (
                it.marks
              ) : (
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="100"
                  aria-label={`Marks for question ${idx + 1}`}
                  className="h-8 w-20"
                  value={it.marks}
                  onChange={(e) => onMarks(idx, parseFloat(e.target.value))}
                />
              )}
            </TD>
            {!locked && (
              <TD className="text-right whitespace-nowrap">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Move up"
                  disabled={idx === 0}
                  onClick={() => onMove(idx, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Move down"
                  disabled={idx === items.length - 1}
                  onClick={() => onMove(idx, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Remove question"
                  onClick={() => onRemove(idx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TD>
            )}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
