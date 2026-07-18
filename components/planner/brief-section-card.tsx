"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface BriefSectionCardProps {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
}

export function BriefSectionCard({ title, eyebrow, children, className }: BriefSectionCardProps) {
  return (
    <Card className={cn("paper-card rounded-xl p-3 animate-fade-up", className)}>
      <div className="space-y-2">
        {eyebrow && <div className="micro-label">{eyebrow}</div>}
        <h3 className="text-sm font-medium text-foreground leading-none">{title}</h3>
      </div>
      <div className="mt-2 space-y-2">{children}</div>
    </Card>
  );
}
