import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MULTI_LABEL, type ExamDetail } from "@/shared/schemas/exam";

/** Read-only overview of the exam's scoring and delivery settings. */
export function ExamConfigSummary({ exam }: { exam: ExamDetail }) {
  const rows = [
    ["Multi-choice scoring", MULTI_LABEL[exam.multiScoring]],
    [
      "Negative marking",
      exam.negativeMarking > 0
        ? `${exam.negativeMarking * 100}% per wrong answer`
        : "Off",
    ],
    ["Question order", exam.shuffleQuestions ? "Shuffled" : "Fixed"],
    ["Option order", exam.shuffleOptions ? "Shuffled" : "Fixed"],
    [
      "Offline recovery window",
      exam.recoveryWindowSeconds > 0
        ? `${exam.recoveryWindowSeconds} seconds`
        : "Disabled",
    ],
    [
      "Answer key",
      exam.showAnswers ? "Shown after results publish" : "Never shown",
    ],
    ["Examiner", exam.ownerName],
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuration summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(([label, value]) => (
            <div key={label} className="space-y-0.5">
              <dt className="text-muted-foreground text-xs">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        {exam.instructions && (
          <div className="bg-muted/50 space-y-1 rounded-md p-3">
            <p className="text-muted-foreground text-xs">Instructions</p>
            <p className="whitespace-pre-wrap">{exam.instructions}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
