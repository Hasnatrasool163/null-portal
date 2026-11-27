import * as React from "react";
import { cn } from "@/lib/utils";

export const Table = ({
  className,
  ...p
}: React.HTMLAttributes<HTMLTableElement>) => (
  <div className="w-full overflow-x-auto rounded-lg border">
    <table className={cn("w-full caption-bottom text-sm", className)} {...p} />
  </div>
);
export const THead = (p: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className="bg-muted/50 text-left" {...p} />
);
export const TBody = (p: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className="divide-y" {...p} />
);
export const TR = ({
  className,
  ...p
}: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("hover:bg-muted/30", className)} {...p} />
);
export const TH = ({
  className,
  ...p
}: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn(
      "text-muted-foreground px-4 py-3 text-xs font-medium",
      className,
    )}
    {...p}
  />
);
export const TD = ({
  className,
  ...p
}: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("px-4 py-3 align-top", className)} {...p} />
);
