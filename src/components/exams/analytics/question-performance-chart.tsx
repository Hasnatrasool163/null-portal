"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import type { QuestionAnalyticsItem } from "@/shared/schemas/secondary";

/** Bar chart of average score and skip rate per question. */
export function QuestionPerformanceChart({
  questions,
}: {
  questions: QuestionAnalyticsItem[];
}) {
  const chartData = questions.map((q) => ({
    name: `Q${q.position + 1}`,
    accuracy: q.avgScorePct,
    skipRate: q.skipRate,
  }));

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Question performance</h3>
          <p className="text-muted-foreground text-sm">Average score and skip rate per question.</p>
        </div>
        <ul className="text-muted-foreground flex gap-4 text-xs">
          <li className="flex items-center gap-1.5">
            <span className="bg-primary h-2.5 w-2.5 rounded-[3px]" aria-hidden="true" />
            Average score
          </li>
          <li className="flex items-center gap-1.5">
            <span className="bg-warning h-2.5 w-2.5 rounded-[3px]" aria-hidden="true" />
            Skipped
          </li>
        </ul>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={3} barCategoryGap="28%" margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              dy={6}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              unit="%"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.6 }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="bg-card shadow-elev-3 rounded-md border px-3 py-2 text-xs">
                    <p className="mb-1 font-semibold">{label}</p>
                    {payload.map((p) => (
                      <p key={String(p.dataKey)} className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-[2px]"
                          style={{ background: String(p.color) }}
                          aria-hidden="true"
                        />
                        <span className="text-muted-foreground">{p.name}</span>
                        <span className="ml-auto pl-3 font-medium tabular-nums">{p.value}%</span>
                      </p>
                    ))}
                  </div>
                ) : null
              }
            />
            <Bar dataKey="accuracy" name="Average score" fill="var(--primary)" radius={[3, 3, 0, 0]} maxBarSize={22} />
            <Bar dataKey="skipRate" name="Skipped" fill="var(--warning)" radius={[3, 3, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
