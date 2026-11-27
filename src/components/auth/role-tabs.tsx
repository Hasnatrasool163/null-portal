"use client";
import { cn } from "@/lib/utils";
import { ROLE_TABS, type RoleKey } from "./role-config";

/** "I am a" segmented control: Candidate / Examiner / Admin. */
export function RoleTabs({
  value,
  onChange,
}: {
  value: RoleKey;
  onChange: (role: RoleKey) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="I am a"
      className="bg-muted grid grid-cols-3 gap-1 rounded-md p-1"
    >
      {ROLE_TABS.map((t) => {
        const on = value === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.key)}
            className={cn(
              "h-8 rounded-[5px] text-[13px] font-medium transition-[background-color,color,box-shadow] duration-150",
              on
                ? "bg-card text-foreground shadow-elev-1"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
