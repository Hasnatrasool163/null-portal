import { format } from "date-fns";
import { FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton, Spinner } from "@/components/ui/misc";
import { SummarySections, type SummarySection } from "./summary-sections";

/**
 * Presentational AI summary card, independent of where the summary comes from:
 * loading → empty (generate CTA) → generating → summary with refresh.
 */
export function SummaryShell({
  title,
  emptyDescription,
  footnote,
  data,
  isInitialLoading,
  isGenerating,
  errorMessage,
  headline,
  sections,
  onGenerate,
}: {
  title: string;
  emptyDescription: string;
  footnote: string;
  data:
    | { generatedAt: string; provider: string; stale: boolean }
    | null
    | undefined;
  isInitialLoading: boolean;
  isGenerating: boolean;
  errorMessage: string | null;
  headline: string | null;
  sections: SummarySection[];
  onGenerate: (refresh: boolean) => void;
}) {
  if (isInitialLoading) {
    return (
      <Card className="p-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-3 h-12 w-full" />
      </Card>
    );
  }

  if (!data && !isGenerating) {
    return (
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="bg-primary/10 text-primary mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
              <FileText className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="space-y-0.5">
              <h2 className="text-sm font-semibold">{title}</h2>
              <p className="text-muted-foreground text-xs">
                {emptyDescription}
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => onGenerate(false)}>
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            Generate quick summary
          </Button>
        </div>
        {errorMessage && (
          <div className="bg-destructive/10 text-destructive mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2 text-xs">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => onGenerate(false)}
              className="font-medium underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        )}
      </Card>
    );
  }

  if (isGenerating && !data) {
    return (
      <Card className="space-y-4 p-5" aria-busy="true">
        <div className="flex items-center gap-2.5 text-sm font-semibold">
          <Spinner />
          <span>Generating {title.toLowerCase()}…</span>
        </div>
        <Skeleton className="h-4 w-5/6" />
        <div className="grid gap-4 pt-1 md:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="bg-primary/10 text-primary mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold">{title}</h2>
              {data?.stale && (
                <span className="bg-warning/15 text-warning rounded px-1.5 py-0.5 text-[11px] font-medium">
                  Updated results available
                </span>
              )}
            </div>
            {data && (
              <p className="text-muted-foreground text-xs">
                {/* Not formatDateTime: that renders without the comma before the time. */}
                Generated {format(new Date(data.generatedAt), "MMM d, yyyy, p")}
              </p>
            )}
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          disabled={isGenerating}
          onClick={() => onGenerate(true)}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isGenerating ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          {isGenerating
            ? "Refreshing…"
            : data?.stale
              ? "Update summary"
              : "Refresh"}
        </Button>
      </div>

      {errorMessage && (
        <div className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-xs">
          {errorMessage}
        </div>
      )}

      {headline && (
        <p className="text-sm leading-relaxed font-medium">{headline}</p>
      )}

      <SummarySections sections={sections} />

      <p className="text-muted-foreground border-t pt-3 text-[11px]">
        {footnote}
      </p>
    </Card>
  );
}
