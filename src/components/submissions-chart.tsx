"use client";
import { format, parseISO } from "date-fns";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Platform usage at a glance: submissions per day for the last 30 days vs the 30 before. */
export function SubmissionsChart({
  series,
  previous,
}: {
  series: { day: string; n: number }[];
  previous: number;
}) {
  const total = series.reduce((s, d) => s + d.n, 0);
  const change = previous > 0 ? Math.round(((total - previous) / previous) * 100) : null;
  const up = change !== null && change >= 0;
  const data = series.map((d) => ({ ...d, label: format(parseISO(d.day), "MMM d") }));

  return (
    <section aria-labelledby="trend-heading" className="space-y-3">
      <h2 id="trend-heading" className="text-sm font-semibold">
        Submissions
      </h2>
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-3xl font-semibold tracking-tight tabular-nums">{total}</p>
            <p className="text-muted-foreground text-xs">in the last 30 days</p>
          </div>
          {change !== null ? (
            <p className={cn("flex items-center gap-1 text-xs font-medium", up ? "text-success" : "text-warning")}>
              {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {up ? "+" : ""}
              {change}% vs previous 30 days
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">No earlier data to compare</p>
          )}
        </div>
        <div className="h-44 w-full" role="img" aria-label={`${total} submissions over the last 30 days`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -24 }} barCategoryGap="18%">
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                interval={6}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                dy={6}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={40}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="bg-card shadow-elev-3 rounded-md border px-3 py-2 text-xs">
                      <p className="text-muted-foreground">
                        {format(parseISO(String(payload[0].payload.day)), "EEE, MMM d")}
                      </p>
                      <p className="font-semibold tabular-nums">
                        {payload[0].value} submission{payload[0].value === 1 ? "" : "s"}
                      </p>
                    </div>
                  ) : null
                }
              />
              <Bar dataKey="n" radius={[3, 3, 0, 0]} maxBarSize={14}>
                {data.map((d, i) => (
                  <Cell
                    key={d.day}
                    fill={i === data.length - 1 ? "var(--primary)" : "color-mix(in srgb, var(--primary) 55%, transparent)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </section>
  );
}
