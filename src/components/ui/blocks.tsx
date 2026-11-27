import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./card";

export function EmptyState({
  title,
  text,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  text?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="animate-page-in bg-card/50 flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center">
      <span className="bg-accent text-accent-foreground mb-1 flex h-11 w-11 items-center justify-center rounded-xl">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="font-medium">{title}</p>
      {text && <p className="text-muted-foreground max-w-sm text-sm">{text}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

const TONE = {
  default: "bg-accent text-accent-foreground",
  success: "bg-success/12 text-success",
  warning: "bg-warning/12 text-warning",
  danger: "bg-destructive/12 text-destructive",
  muted: "bg-muted text-muted-foreground",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: keyof typeof TONE;
  className?: string;
}) {
  return (
    <Card className={cn("flex items-start gap-4 p-5", className)}>
      {Icon && (
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            TONE[tone],
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-muted-foreground text-[13px]">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
        {hint && (
          <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>
        )}
      </div>
    </Card>
  );
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-primary mb-1 font-mono text-xs tracking-wide">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-[28px]">
          {title}
        </h1>
        {subtitle && (
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            {subtitle}
          </p>
        )}
      </div>
      {actions}
    </div>
  );
}
