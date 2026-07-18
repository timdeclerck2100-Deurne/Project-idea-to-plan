"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PlannerShellProps {
  children: React.ReactNode;
  className?: string;
}

export function PlannerShell({ children, className }: PlannerShellProps) {
  return (
    <main className={cn("planner-bg min-h-screen flex-1", className)}>
      <div className="px-4 py-4 lg:px-8 lg:py-5 relative z-10 h-screen flex flex-col overflow-hidden">
        {children}
      </div>
    </main>
  );
}
