"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface GenerationStatusProps {
  status: "idle" | "generating" | "done" | "error";
  progress: string;
  error?: string;
}

export function GenerationStatus({ status, progress, error }: GenerationStatusProps) {
  if (status === "idle") return null;

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
        {progress && status === "generating" && (
          <span className="text-xs text-muted-foreground truncate max-w-lg">
            {progress.slice(0, 120)}...
          </span>
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive leading-relaxed">{error}</p>
      )}
    </div>
  );
}
