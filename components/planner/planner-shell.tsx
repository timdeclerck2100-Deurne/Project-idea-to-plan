"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PlannerShellProps {
  children: React.ReactNode;
  className?: string;
}

export function PlannerShell({ children, className }: PlannerShellProps) {
  return (
    <>
      <a
        href="#planner-workflow"
        className="fixed left-3 top-3 z-50 -translate-y-20 rounded-xl bg-background px-4 py-3 font-semibold text-foreground shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to project workflow
      </a>
      <main
        id="planner-workflow"
        tabIndex={-1}
        className={cn(
          "planner-bg min-h-[100dvh] w-full flex-1 scroll-mt-4 [padding-bottom:max(var(--gutter-canvas),env(safe-area-inset-bottom))] [padding-left:max(var(--gutter-canvas),env(safe-area-inset-left))] [padding-right:max(var(--gutter-canvas),env(safe-area-inset-right))] [padding-top:max(var(--gutter-canvas),env(safe-area-inset-top))]",
          className
        )}
      >
        <div className="relative z-10 flex min-w-0 flex-col gap-4">{children}</div>
      </main>
    </>
  );
}
