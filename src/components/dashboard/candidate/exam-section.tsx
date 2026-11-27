"use client";
import type { MyExamItem } from "@/shared/schemas/attempt";
import { ExamCard } from "./exam-card";

/** Headed grid of exam cards ("Available now (2)"); `emptyText` shows when the list is empty. */
export function ExamSection({
  title,
  items,
  emptyText,
  startingId = null,
  onStart = () => {},
}: {
  title: string;
  items: MyExamItem[];
  emptyText?: string;
  startingId?: string | null;
  onStart?: (examId: string) => void;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">
        {title} ({items.length})
      </h2>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{emptyText}</p>
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <ExamCard
              key={item.examId}
              item={item}
              startingId={startingId}
              onStart={onStart}
            />
          ))}
        </div>
      )}
    </section>
  );
}
