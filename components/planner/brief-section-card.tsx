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
  embedded?: boolean;
}

export function BriefSectionCard({
  title,
  eyebrow,
  children,
  actions,
  assistant,
  className,
  embedded = false,
}: BriefSectionCardProps) {
  return (
    <Card
      variant={embedded ? "plain" : "paper"}
      className={cn(
        "min-w-0 animate-fade-up",
        embedded ? "rounded-none border-t border-border pt-4" : "rounded-xl p-3",
        className,
      )}
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-2">
          {eyebrow && <div className="micro-label !text-sm">{eyebrow}</div>}
          <h3 className="text-base font-medium text-foreground leading-tight text-pretty">{title}</h3>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-1">{actions}</div>}
      </div>
      <div className="mt-2 flex min-w-0 flex-col gap-2">{children}</div>
      {assistant && <div className="mt-2 min-w-0">{assistant}</div>}
    </Card>
  );
}
