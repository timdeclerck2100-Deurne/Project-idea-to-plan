"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface CommandRailProps {
  children: React.ReactNode;
  className?: string;
  status?: "idle" | "generating" | "done" | "error";
}

export function CommandRail({ children, className, status = "idle" }: CommandRailProps) {
  return (
    <Card className={cn("glass-panel rounded-2xl overflow-hidden", className)}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="micro-label">Command Rail</span>
        <Badge variant={status === "generating" ? "accent" : status === "error" ? "destructive" : "outline"}>
          {status === "idle" && "Ready"}
          {status === "generating" && "Generating..."}
          {status === "done" && "Complete"}
          {status === "error" && "Error"}
        </Badge>
      </div>
      <div className="p-4">{children}</div>
    </Card>
  );
}
