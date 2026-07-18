"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export interface BriefSectionCardProps {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  assistant?: React.ReactNode;
  className?: string;
}

export function BriefSectionCard({
  title,
  eyebrow,
  children,
  actions,
  assistant,
  className,
}: BriefSectionCardProps) {
  return (
    <Card className={cn("paper-card min-w-0 rounded-xl p-3 animate-fade-up", className)}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-2">
          {eyebrow && <div className="micro-label">{eyebrow}</div>}
          <h3 className="text-sm font-medium text-foreground leading-none">{title}</h3>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-1">{actions}</div>}
      </div>
      <div className="mt-2 flex min-w-0 flex-col gap-2">{children}</div>
      {assistant && <div className="mt-2 min-w-0">{assistant}</div>}
    </Card>
  );
}
