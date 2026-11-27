"use client";
import { useEffect, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type UnderlineTab<T extends string> = { id: T; label: string; count?: number };

/**
 * Tab strip whose underline GLIDES to the active tab (position + width), instead of
 * jumping. Arrow keys / Home / End move between tabs (WAI-ARIA tabs pattern).
 */
export function UnderlineTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  className,
}: {
  tabs: UnderlineTab<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  className?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const indRef = useRef<HTMLSpanElement>(null);
  const tabRefs = useRef(new Map<T, HTMLButtonElement>());
  const placed = useRef(false);

  // Position the indicator directly on the DOM: no state, no extra renders.
  const place = () => {
    const el = tabRefs.current.get(value);
    const ind = indRef.current;
    if (!el || !ind) return;
    ind.style.width = `${el.offsetWidth - 16}px`;
    ind.style.transform = `translateX(${el.offsetLeft + 8}px)`;
    if (!placed.current) {
      placed.current = true;
      // Enable the glide only after the first placement (no animation on load).
      requestAnimationFrame(() => ind.setAttribute("data-ready", ""));
    }
  };

  useLayoutEffect(() => {
    place();
    tabRefs.current.get(value)?.scrollIntoView({ block: "nearest", inline: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, tabs.length]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const ro = new ResizeObserver(() => place());
    ro.observe(list);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function onKeyDown(e: React.KeyboardEvent) {
    const i = tabs.findIndex((t) => t.id === value);
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(tabs[next].id);
    tabRefs.current.get(tabs[next].id)?.focus();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        "relative flex gap-1 overflow-x-auto overflow-y-hidden border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => {
              if (el) tabRefs.current.set(t.id, el);
              else tabRefs.current.delete(t.id);
            }}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={cn(
              "focus-visible:ring-ring relative shrink-0 rounded-t-md px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset",
              on ? "text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={cn("ml-1.5 tabular-nums", on ? "text-muted-foreground" : "opacity-70")}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
      <span
        ref={indRef}
        aria-hidden="true"
        className="bg-primary pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full data-[ready]:transition-[transform,width] data-[ready]:duration-300 data-[ready]:ease-[cubic-bezier(0.2,0.8,0.2,1)]"
      />
    </div>
  );
}
