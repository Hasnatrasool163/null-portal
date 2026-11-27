import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Sample-file downloads and the expected column format. */
export function ImportFormatHelp() {
  return (
    <div className="bg-muted/40 space-y-2 rounded-lg px-4 py-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-foreground font-medium">File format</span>
        <span className="flex gap-1">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
          >
            <a href="/samples/questions-sample.csv" download>
              <Download className="h-3.5 w-3.5" />
              Sample CSV
            </a>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
          >
            <a href="/samples/questions-sample.json" download>
              <Download className="h-3.5 w-3.5" />
              Sample JSON
            </a>
          </Button>
        </span>
      </div>
      <p className="text-muted-foreground leading-relaxed">
        Columns:{" "}
        <code className="text-foreground">
          topic, difficulty, type, body, marks, options, correct
        </code>
        . Separate options with <code className="text-foreground">|</code> and
        correct option numbers with <code className="text-foreground">;</code>.
        Topics that don&apos;t exist yet are created.
      </p>
    </div>
  );
}
