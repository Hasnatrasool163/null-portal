"use client";
import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Kbd } from "./misc";

/** Types each phrase, holds it, erases it, moves to the next. Static under reduced motion. */
function useTypewriter(phrases: string[], active: boolean) {
  const [text, setText] = React.useState("");
  const key = phrases.join("|");

  React.useEffect(() => {
    if (!active || phrases.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => setText(phrases[0]), 0);
      return () => clearTimeout(t);
    }
    let i = 0;
    let len = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const word = phrases[i % phrases.length];
      if (!deleting) {
        len++;
        setText(word.slice(0, len));
        if (len >= word.length) {
          deleting = true;
          timer = setTimeout(tick, 1600);
          return;
        }
        timer = setTimeout(tick, 55 + Math.random() * 45);
      } else {
        len--;
        setText(word.slice(0, len));
        if (len <= 0) {
          deleting = false;
          i++;
          timer = setTimeout(tick, 350);
          return;
        }
        timer = setTimeout(tick, 28);
      }
    };
    timer = setTimeout(tick, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, active]);

  return text;
}

/**
 * Search box used on every list page. While empty and unfocused it "types"
 * example queries relevant to the page. Press "/" anywhere to focus it.
 */
export function SearchInput({
  value,
  onChange,
  phrases,
  prefix = "Search ",
  label,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  phrases: string[];
  prefix?: string;
  label: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [focused, setFocused] = React.useState(false);
  const showHint = !focused && value.length === 0;
  const typed = useTypewriter(phrases, showHint);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const typing =
        t?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(t?.tagName ?? "");
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        ref.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={cn("group relative w-full max-w-sm", className)}>
      <Search
        className="text-muted-foreground group-focus-within:text-primary pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors"
        aria-hidden="true"
      />
      <input
        ref={ref}
        type="search"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.preventDefault();
            onChange("");
          }
        }}
        placeholder={focused ? `${prefix.trim()}…` : undefined}
        className={cn(
          "bg-muted/70 h-10 w-full rounded-md border border-transparent pr-16 pl-9 text-sm [&::-webkit-search-cancel-button]:hidden",
          "hover:bg-muted transition-[background-color,border-color,box-shadow] duration-150",
          "focus-visible:border-primary/50 focus-visible:bg-card focus-visible:ring-primary/15 focus-visible:ring-[3px] focus-visible:outline-none",
        )}
      />
      {showHint && (
        <span
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-9 max-w-[calc(100%-6rem)] -translate-y-1/2 truncate text-sm"
        >
          {prefix}
          <span className="text-foreground/70">{typed}</span>
          <span className="animate-caret text-primary ml-px">|</span>
        </span>
      )}
      <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
        {value ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              onChange("");
              ref.current?.focus();
            }}
            className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-md p-1 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <Kbd className="hidden sm:inline-flex">/</Kbd>
        )}
      </div>
    </div>
  );
}
