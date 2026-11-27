import { AlertTriangle, ArrowRight, CheckCircle2, Target } from "lucide-react";

export type SummarySection = {
  title: string;
  items: string[];
  tone: "success" | "warning" | "primary";
};

const TONE = {
  success: {
    icon: CheckCircle2,
    color: "text-success",
    dot: "bg-success",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-warning",
    dot: "bg-warning",
  },
  primary: {
    icon: Target,
    color: "text-primary",
    dot: "bg-primary",
  },
} as const;

/** Up to three titled bullet columns; empty sections are dropped. */
export function SummarySections({ sections }: { sections: SummarySection[] }) {
  const visibleSections = sections.filter((s) => s.items.length > 0);
  if (visibleSections.length === 0) return null;

  return (
    <div
      className={`grid gap-4 border-t pt-4 ${
        visibleSections.length === 3
          ? "md:grid-cols-3"
          : visibleSections.length === 2
            ? "md:grid-cols-2"
            : ""
      }`}
    >
      {visibleSections.map((sec) => {
        const cfg = TONE[sec.tone];
        const Icon = cfg.icon;
        return (
          <div key={sec.title} className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
              <Icon className={`h-3.5 w-3.5 ${cfg.color}`} aria-hidden="true" />
              <span>{sec.title}</span>
            </h3>
            <ul className="space-y-1.5 text-sm">
              {sec.items.map((item, idx) => (
                <li
                  key={idx}
                  className="text-muted-foreground flex items-start gap-2 leading-snug"
                >
                  {sec.tone === "primary" ? (
                    <ArrowRight
                      className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                  ) : (
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`}
                      aria-hidden="true"
                    />
                  )}
                  <span className="text-foreground/90">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
