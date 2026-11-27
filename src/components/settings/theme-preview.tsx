import { cn } from "@/lib/utils";

export type ThemeMode = "light" | "dark" | "system";

// Mini window mock used as the theme preview.
export function ThemePreview({ mode }: { mode: ThemeMode }) {
  const pane = (dark: boolean) => (
    <div
      className={cn(
        "flex h-full flex-1 gap-1.5 p-2",
        dark ? "bg-[#15181d]" : "bg-[#f6f7f9]",
      )}
    >
      <div
        className={cn("w-1/4 rounded-sm", dark ? "bg-[#1c2027]" : "bg-white")}
      />
      <div className="flex flex-1 flex-col gap-1.5">
        <div
          className={cn(
            "h-2 w-2/3 rounded-full",
            dark ? "bg-[#303642]" : "bg-[#d5dae1]",
          )}
        />
        <div
          className={cn(
            "h-2 w-1/2 rounded-full",
            dark ? "bg-[#303642]" : "bg-[#d5dae1]",
          )}
        />
        <div className="mt-auto h-3 w-8 rounded-sm bg-[#0f6b6e]" />
      </div>
    </div>
  );
  return (
    <div
      className="flex h-20 overflow-hidden rounded-md border"
      aria-hidden="true"
    >
      {mode === "system" ? (
        <>
          {pane(false)}
          {pane(true)}
        </>
      ) : (
        pane(mode === "dark")
      )}
    </div>
  );
}
