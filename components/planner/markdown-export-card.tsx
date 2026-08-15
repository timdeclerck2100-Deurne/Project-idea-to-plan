"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check, Download, Loader2 } from "lucide-react";

interface MarkdownExportCardProps {
  markdown: string;
  filename?: string;
  isUpdating?: boolean;
}

export function MarkdownExportCard({ markdown, filename = "project-brief.md", isUpdating = false }: MarkdownExportCardProps) {
  const [copyStatus, setCopyStatus] = React.useState<"idle" | "copied" | "error">("idle");
  const statusId = `${React.useId()}-copy-status`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("error");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="paper-card min-w-0 rounded-xl p-3">
      <div className="mb-2 flex min-w-0 flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="micro-label !text-sm">Export</div>
          <h3 className="text-base font-medium text-foreground leading-tight text-pretty">Markdown Brief</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            aria-describedby={copyStatus === "idle" ? undefined : statusId}
          >
            {copyStatus === "copied" ? (
              <Check data-icon="inline-start" className="text-accent" />
            ) : (
              <Copy data-icon="inline-start" />
            )}
            {copyStatus === "copied" ? "Copied" : "Copy"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleDownload}>
            <Download data-icon="inline-start" />
            Download
          </Button>
        </div>
      </div>
      <p
        id={statusId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={copyStatus === "error" ? "mb-2 text-base text-destructive" : "sr-only"}
      >
        {copyStatus === "copied"
          ? "Markdown brief copied to clipboard."
          : copyStatus === "error"
            ? "Could not copy. Try again."
            : ""}
      </p>
      <ScrollArea className="max-h-[350px]">
        {isUpdating ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="animate-spin" />
            <span className="text-base">Regenerating...</span>
          </div>
        ) : (
          <pre className="min-w-0 whitespace-pre-wrap break-words font-mono text-base leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
            {markdown}
          </pre>
        )}
      </ScrollArea>
    </Card>
  );
}
