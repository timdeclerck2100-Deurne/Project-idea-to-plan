"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

type GenerationSection = "overview" | "starter-prompt" | "formatting" | "done";

interface GenerationStatusProps {
  status: "idle" | "generating" | "done" | "error";
  progress: string;
  section?: GenerationSection;
  error?: string;
  onRetry?: () => void;
}

const sectionLabels: Record<GenerationSection, string> = {
  "overview": "Generating brief overview…",
  "starter-prompt": "Generating starter prompt…",
  "formatting": "Formatting markdown brief…",
  "done": "Complete",
};

export function GenerationStatus({
  status,
  progress,
  section,
  error,
  onRetry,
}: GenerationStatusProps) {
  if (status === "idle" || status === "done") return null;

  const displayProgress = section && sectionLabels[section]
    ? sectionLabels[section]
    : progress;

  return (
    <div
      className={cn(
        "animate-fade-up border-y px-1 py-3 sm:px-2",
        status === "generating" && "border-accent/30",
        status === "error" && "border-destructive/40"
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div
          role={status === "error" ? "alert" : "status"}
          aria-live={status === "error" ? "assertive" : "polite"}
          aria-atomic="true"
          className="min-w-0 flex-1 space-y-1"
        >
          <div className="flex flex-wrap items-center gap-2">
            <strong className={cn("micro-label", status === "error" && "text-destructive")}>
              {status === "generating" ? "Generating…" : "Error"}
            </strong>
            {displayProgress && status === "generating" && (
              <span className="min-w-0 flex-1 break-words text-sm text-muted-foreground">
                {displayProgress}
              </span>
            )}
          </div>
          {error && <p className="text-sm text-destructive leading-relaxed">{error}</p>}
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCcw data-icon="inline-start" />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
