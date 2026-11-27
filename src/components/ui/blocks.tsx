import { cn } from "@/lib/utils";
import { Card } from "./card";

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center">
      <p className="font-medium">{title}</p>
      {text && <p className="text-muted-foreground max-w-sm text-sm">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("p-5", className)}>
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
    </Card>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        )}
      </div>
      {actions}
    </div>
  );
}
