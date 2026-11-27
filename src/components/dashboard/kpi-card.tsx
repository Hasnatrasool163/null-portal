import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Linked headline number with a coloured top accent, an icon and one line of context. Server-safe. */
export function KpiCard({
  href,
  label,
  value,
  context,
  icon: Icon,
  tone,
  accent,
}: {
  href: string;
  label: string;
  value: number;
  context: string;
  icon: LucideIcon;
  tone: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="group focus-visible:ring-ring rounded-lg focus-visible:ring-2 focus-visible:outline-none"
    >
      <Card interactive className="relative h-full overflow-hidden p-4">
        <span
          className={cn("absolute inset-x-0 top-0 h-0.5 opacity-70", accent)}
          aria-hidden="true"
        />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-[13px] font-medium">
            {label}
          </span>
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md",
              tone,
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
        <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
        <p className="text-muted-foreground mt-1 flex items-center justify-between gap-2 text-xs">
          <span className="truncate">{context}</span>
          <ArrowRight
            className="h-3.5 w-3.5 shrink-0 -translate-x-1 opacity-0 transition-[opacity,transform] group-hover:translate-x-0 group-hover:opacity-100"
            aria-hidden="true"
          />
        </p>
      </Card>
    </Link>
  );
}
