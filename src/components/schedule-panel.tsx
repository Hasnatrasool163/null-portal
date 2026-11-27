"use client";
import Link from "next/link";
import { useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { OverviewExam } from "@/shared/schemas/exam";

const LIMIT = 5;

/** Dashboard schedule: Live / Upcoming tabs, top five each, link to the full filtered list. */
export function SchedulePanel({
  live,
  upcoming,
  liveTotal,
  upcomingTotal,
}: {
  live: OverviewExam[];
  upcoming: OverviewExam[];
  liveTotal: number;
  upcomingTotal: number;
}) {
  const [tab, setTab] = useState<"live" | "upcoming">(
    live.length > 0 ? "live" : "upcoming",
  );

  // Busiest and most-flagged live exams first; idle ones sink.
  const liveSorted = [...live].sort(
    (a, b) =>
      b.incidents24h - a.incidents24h ||
      b.active - a.active ||
      a.endsAt.localeCompare(b.endsAt),
  );
  const rows = (tab === "live" ? liveSorted : upcoming).slice(0, LIMIT);
  const total = tab === "live" ? liveTotal : upcomingTotal;

  const tabs = [
    { key: "live" as const, label: "Live", count: liveTotal },
    { key: "upcoming" as const, label: "Upcoming", count: upcomingTotal },
  ];

  return (
    <section aria-labelledby="schedule-heading" className="space-y-3">
      <div className="flex h-8 items-center justify-between gap-3">
        <h2 id="schedule-heading" className="text-sm font-semibold">
          Schedule
        </h2>
        <div
          role="tablist"
          aria-label="Schedule"
          className="bg-muted flex gap-0.5 rounded-md p-0.5"
        >
          {tabs.map((t) => {
            const on = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 text-xs font-medium transition-[background-color,color,box-shadow]",
                  on
                    ? "bg-card text-foreground shadow-elev-1"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
                <span className="text-muted-foreground tabular-nums">
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-muted-foreground px-5 py-6 text-sm">
            {tab === "live"
              ? "No exams are live right now."
              : "Nothing scheduled yet."}
          </p>
        ) : (
          <ul key={tab} className="animate-page-in divide-y">
            {rows.map((e) => (
              <li key={e.id}>
                <Link
                  href={
                    tab === "live"
                      ? `/exams/${e.id}?tab=monitor`
                      : `/exams/${e.id}`
                  }
                  className="hover:bg-muted/40 focus-visible:ring-ring flex items-center gap-3.5 px-5 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                >
                  {tab === "live" ? (
                    <span
                      className="flex w-9 shrink-0 justify-center"
                      aria-hidden="true"
                    >
                      <span className="relative flex h-2.5 w-2.5">
                        {e.active > 0 && (
                          <span className="bg-success absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" />
                        )}
                        <span
                          className={cn(
                            "relative inline-flex h-2.5 w-2.5 rounded-full",
                            e.active > 0 ? "bg-success" : "bg-success/40",
                          )}
                        />
                      </span>
                    </span>
                  ) : (
                    <span
                      className="bg-muted/60 flex w-9 shrink-0 flex-col items-center rounded-md py-1 leading-none"
                      aria-hidden="true"
                    >
                      <span className="text-primary text-[9px] font-semibold uppercase">
                        {format(new Date(e.startsAt), "MMM")}
                      </span>
                      <span className="text-sm font-semibold tabular-nums">
                        {format(new Date(e.startsAt), "d")}
                      </span>
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {e.title}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {tab === "live"
                        ? `${e.active} sitting · ${e.submitted}/${e.enrolled} submitted · closes in ${formatDistanceToNowStrict(new Date(e.endsAt))}`
                        : `Opens in ${formatDistanceToNowStrict(new Date(e.startsAt))} · ${e.enrolled} enrolled`}
                    </span>
                  </span>
                  {tab === "live" && e.incidents24h > 0 && (
                    <span className="text-warning shrink-0 text-xs font-medium tabular-nums">
                      {e.incidents24h} flag{e.incidents24h === 1 ? "" : "s"}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {total > LIMIT && (
          <Link
            href={`/exams?phase=${tab === "live" ? "ONGOING" : "UPCOMING"}`}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/40 flex items-center justify-between border-t px-5 py-2.5 text-xs font-medium transition-colors"
          >
            View all {total} {tab === "live" ? "live" : "upcoming"} exams
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </Card>
    </section>
  );
}
