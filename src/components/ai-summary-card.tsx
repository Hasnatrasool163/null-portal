"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  FileText,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton, Spinner } from "@/components/ui/misc";
import { api } from "@/lib/api-client";
import type {
  CandidateSummaryResponse,
  ExamAnalyticsSummaryResponse,
} from "@/shared/schemas/ai-summary";

type Section = {
  title: string;
  items: string[];
  tone: "success" | "warning" | "primary";
};

const TONE = {
  success: {
    icon: CheckCircle2,
    color: "text-success",
    dot: "bg-success",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-warning",
    dot: "bg-warning",
  },
  primary: {
    icon: Target,
    color: "text-primary",
    dot: "bg-primary",
  },
} as const;

function SummaryShell({
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
  sections: Section[];
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

  const visibleSections = sections.filter((s) => s.items.length > 0);

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

      {visibleSections.length > 0 && (
        <div
          className={`grid gap-4 border-t pt-4 ${
            visibleSections.length === 3
              ? "md:grid-cols-3"
              : visibleSections.length === 2
                ? "md:grid-cols-2"
                : ""
          }`}
        >
          {visibleSections.map((sec) => {
            const cfg = TONE[sec.tone];
            const Icon = cfg.icon;
            return (
              <div key={sec.title} className="space-y-2">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                  <Icon
                    className={`h-3.5 w-3.5 ${cfg.color}`}
                    aria-hidden="true"
                  />
                  <span>{sec.title}</span>
                </h3>
                <ul className="space-y-1.5 text-sm">
                  {sec.items.map((item, idx) => (
                    <li
                      key={idx}
                      className="text-muted-foreground flex items-start gap-2 leading-snug"
                    >
                      {sec.tone === "primary" ? (
                        <ArrowRight
                          className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        />
                      ) : (
                        <span
                          className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`}
                          aria-hidden="true"
                        />
                      )}
                      <span className="text-foreground/90">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-muted-foreground border-t pt-3 text-[11px]">
        {footnote}
      </p>
    </Card>
  );
}

export function AttemptAiSummaryCard({ attemptId }: { attemptId: string }) {
  const qc = useQueryClient();
  const queryKey = ["attempt-ai-summary", attemptId];

  const cached = useQuery({
    queryKey,
    queryFn: () =>
      api<CandidateSummaryResponse | null>(
        `/api/attempts/${attemptId}/summary`,
      ),
  });

  const generate = useMutation({
    mutationFn: (refresh: boolean) =>
      api<CandidateSummaryResponse>(`/api/attempts/${attemptId}/summary`, {
        method: "POST",
        body: { refresh },
      }),
    onSuccess: (res) => {
      qc.setQueryData(queryKey, res);
    },
  });

  const data = generate.data ?? cached.data ?? null;

  return (
    <SummaryShell
      title="AI quick summary"
      emptyDescription="Get an instant breakdown of your strengths, focus areas, and next study steps."
      footnote="AI-generated from your published result data. Official marks and examiner feedback take precedence."
      data={data}
      isInitialLoading={cached.isPending}
      isGenerating={generate.isPending}
      errorMessage={generate.isError ? generate.error.message : null}
      headline={data?.summary.headline ?? null}
      sections={
        data
          ? [
              {
                title: "Strengths",
                items: data.summary.strengths,
                tone: "success",
              },
              {
                title: "Areas to improve",
                items: data.summary.areasToImprove,
                tone: "warning",
              },
              {
                title: "Next steps",
                items: data.summary.nextSteps,
                tone: "primary",
              },
            ]
          : []
      }
      onGenerate={(refresh) => generate.mutate(refresh)}
    />
  );
}

export function ExamAnalyticsAiSummaryCard({ examId }: { examId: string }) {
  const qc = useQueryClient();
  const queryKey = ["exam-analytics-ai-summary", examId];

  const cached = useQuery({
    queryKey,
    queryFn: () =>
      api<ExamAnalyticsSummaryResponse | null>(
        `/api/exams/${examId}/analytics/summary`,
      ),
  });

  const generate = useMutation({
    mutationFn: (refresh: boolean) =>
      api<ExamAnalyticsSummaryResponse>(
        `/api/exams/${examId}/analytics/summary`,
        {
          method: "POST",
          body: { refresh },
        },
      ),
    onSuccess: (res) => {
      qc.setQueryData(queryKey, res);
    },
  });

  const data = generate.data ?? cached.data ?? null;

  return (
    <SummaryShell
      title="AI cohort summary"
      emptyDescription="Generate a quick executive takeaway of cohort performance, tricky questions, and follow-up actions."
      footnote="AI-generated from real submitted attempts (sandbox previews excluded). Verify item statistics below before making grading changes."
      data={data}
      isInitialLoading={cached.isPending}
      isGenerating={generate.isPending}
      errorMessage={generate.isError ? generate.error.message : null}
      headline={data?.summary.overview ?? null}
      sections={
        data
          ? [
              {
                title: "Strong areas",
                items: data.summary.strongAreas,
                tone: "success",
              },
              {
                title: "Needs attention",
                items: data.summary.attentionItems,
                tone: "warning",
              },
              {
                title: "Recommendations",
                items: data.summary.recommendations,
                tone: "primary",
              },
            ]
          : []
      }
      onGenerate={(refresh) => generate.mutate(refresh)}
    />
  );
}
