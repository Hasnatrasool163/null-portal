"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "./button";
import { Spinner } from "./misc";

/**
 * Downloads a server-generated file (PDF reports) with a loading state and a
 * readable error instead of a silent failed link.
 */
export function DownloadButton({
  href,
  fallbackName,
  children,
  variant = "outline",
  size,
}: {
  href: string;
  fallbackName: string;
  children: React.ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const res = await fetch(href);
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message ?? `Download failed (${res.status})`);
      }
      const blob = await res.blob();
      const name =
        /filename="?([^";]+)"?/.exec(res.headers.get("content-disposition") ?? "")?.[1] ??
        fallbackName;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Report downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant={variant} size={size} disabled={busy} onClick={download}>
      {busy ? <Spinner /> : <Download className="h-4 w-4 group-hover/btn:translate-y-0.5" />}
      {busy ? "Preparing PDF…" : children}
    </Button>
  );
}
