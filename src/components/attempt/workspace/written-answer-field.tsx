"use client";

/** Free-text answer box for WRITTEN questions. */
export function WrittenAnswerField({
  questionId,
  value,
  onChange,
}: {
  questionId: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={`written-${questionId}`} className="text-sm font-medium">
        Your answer
      </label>
      <textarea
        id={`written-${questionId}`}
        rows={8}
        maxLength={10_000}
        placeholder="Type your response here..."
        className="q-text border-input bg-background focus-visible:border-primary focus-visible:ring-primary/20 w-full rounded-lg border px-3 py-2 focus-visible:ring-4 focus-visible:outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-muted-foreground text-right text-xs">
        {value.length} / 10,000 characters
      </p>
    </div>
  );
}
