"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { FlaskConical, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { examsApi } from "@/lib/api";

/** Shown on examiner sandbox previews: reset or leave the preview. */
export function SandboxBanner({ examId }: { examId: string }) {
  const router = useRouter();
  const resetSandbox = useMutation({
    mutationFn: () => examsApi.startSandbox(examId, true),
    onSuccess: (r) => {
      router.push(`/attempts/${r.attemptId}`);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="border-warning/30 bg-warning/8 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm">
      <span className="flex items-center gap-2.5">
        <span className="bg-warning/15 text-warning flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
          <FlaskConical className="h-4 w-4" aria-hidden="true" />
        </span>
        <span>
          <span className="font-semibold">Sandbox preview</span>
          <span className="text-muted-foreground">
            {" "}
            · Not counted in results, statistics or reports.
          </span>
        </span>
      </span>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={resetSandbox.isPending}
          onClick={() => resetSandbox.mutate()}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset preview
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/exams/${examId}`}>Exit sandbox</Link>
        </Button>
      </div>
    </div>
  );
}
