"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type GenerationSection = "overview" | "starter-prompt" | "formatting" | "done";

interface GenerationStatusProps {
  status: "idle" | "generating" | "done" | "error";
  progress: string;
  section?: GenerationSection;
  error?: string;
}

const sectionLabels: Record<GenerationSection, string> = {
  "overview": "Generating brief overview...",
  "starter-prompt": "Generating starter prompt...",
  "formatting": "Formatting markdown brief...",
  "done": "Complete",
};

export function GenerationStatus({ status, progress, section, error }: GenerationStatusProps) {
  if (status === "idle") return null;

  const displayProgress = section && sectionLabels[section]
    ? sectionLabels[section]
    : progress;

  return (
    <div className={cn(
      "rounded-xl border px-4 py-2.5 space-y-1 animate-fade-up",
      status === "generating" && "bg-accent/10 border-accent/20",
      status === "done" && "bg-primary/10 border-primary/20",
      status === "error" && "bg-destructive/10 border-destructive/20"
    )}>
      <div className="flex items-center gap-2">
        <Badge variant={status === "generating" ? "accent" : status === "error" ? "destructive" : "default"}>
          {status === "generating" && "Generating..."}
          {status === "done" && "Complete"}
          {status === "error" && "Error"}
        </Badge>
        {displayProgress && status === "generating" && (
          <span className="text-xs text-muted-foreground truncate max-w-lg">
            {displayProgress}
          </span>
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive leading-relaxed">{error}</p>
      )}
    </div>
  );
}
