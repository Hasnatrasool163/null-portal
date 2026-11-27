import Link from "next/link";
import { ArrowRight, CheckCircle2, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type AttentionItem = {
  key: string;
  href: string;
  icon: LucideIcon;
  tone: string;
  title: string;
  subtitle: string;
  /** Call-to-action label; without one the row ends in a plain arrow. */
  cta?: string;
};

/**
 * Titled card listing follow-ups (first `max`, then "+N more in Exams"), or an
 * all-clear message when there are none. Server-safe.
 */
export function AttentionPanel({
  headingId,
  heading,
  items,
  max,
  emptyTitle,
  emptyText,
}: {
  headingId: string;
  heading: string;
  items: AttentionItem[];
  max: number;
  emptyTitle: string;
  emptyText: string;
}) {
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h2
        id={headingId}
        className="flex h-8 items-center text-sm font-semibold"
      >
        {heading}
      </h2>
      <Card className="overflow-hidden">
        {items.length === 0 ? (
          <div className="flex items-center gap-3 px-5 py-6">
            <CheckCircle2 className="text-success h-5 w-5" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium">{emptyTitle}</p>
              <p className="text-muted-foreground text-xs">{emptyText}</p>
            </div>
          </div>
        ) : (
          <ul className="divide-y">
            {items.slice(0, max).map((a) => (
              <li key={a.key}>
                <Link
                  href={a.href}
                  className="group hover:bg-muted/40 focus-visible:ring-ring flex items-center gap-3.5 px-5 py-3.5 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                >
                  <a.icon
                    className={cn("h-[18px] w-[18px] shrink-0", a.tone)}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {a.title}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {a.subtitle}
                    </span>
                  </span>
                  {a.cta !== undefined ? (
                    <span className="text-primary flex items-center gap-1 text-xs font-medium">
                      {a.cta}
                      <ArrowRight
                        className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  ) : (
                    <ArrowRight
                      className="text-muted-foreground h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {items.length > max && (
          <p className="text-muted-foreground border-t px-5 py-2.5 text-xs">
            +{items.length - max} more in{" "}
            <Link
              href="/exams"
              className="text-foreground font-medium hover:underline"
            >
              Exams
            </Link>
          </p>
        )}
      </Card>
    </section>
  );
}
