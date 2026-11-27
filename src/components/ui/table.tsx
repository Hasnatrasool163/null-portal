import * as React from "react";
import { cn } from "@/lib/utils";

export const Table = ({
  className,
  ...p
}: React.HTMLAttributes<HTMLTableElement>) => (
  <div className="bg-card shadow-elev-1 w-full overflow-x-auto rounded-lg border">
    <table className={cn("w-full caption-bottom text-sm", className)} {...p} />
  </div>
);
export const THead = (p: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className="bg-muted/60 text-left" {...p} />
);
export const TBody = (p: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className="stagger divide-y" {...p} />
);
export const TR = ({
  className,
  ...p
}: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr
    className={cn("hover:bg-accent/40 transition-colors", className)}
    {...p}
  />
);
export const TH = ({
  className,
  ...p
}: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn(
      "text-muted-foreground px-4 py-3 text-xs font-medium whitespace-nowrap",
      className,
    )}
    {...p}
  />
);
export const TD = ({
  className,
  ...p
}: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("px-4 py-3 align-middle", className)} {...p} />
);
