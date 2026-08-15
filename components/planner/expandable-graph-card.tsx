"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";

interface ExpandableGraphCardProps {
  title: string;
  eyebrow?: string;
  description: string;
  outline: React.ReactNode;
  children: (expanded: boolean) => React.ReactNode;
}

export function ExpandableGraphCard({ title, eyebrow, description, outline, children }: ExpandableGraphCardProps) {
  const [expanded, setExpanded] = React.useState(false);
  const headingId = React.useId();
  const descriptionId = React.useId();
  const canvasId = React.useId();

  return (
    <Card
      className="paper-card flex min-w-0 flex-col rounded-xl p-4"
      role="region"
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
      data-expanded={expanded}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          {eyebrow && <div className="micro-label">{eyebrow}</div>}
          <h3 id={headingId} className="font-display text-base font-bold text-foreground">{title}</h3>
          <p id={descriptionId} className="mt-1 max-w-[var(--measure-readable)] text-base leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setExpanded((current) => !current)}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${title}`}
          aria-expanded={expanded}
          aria-controls={canvasId}
          className="size-11 shrink-0 p-0"
        >
          {expanded ? (
            <Minimize2 className="size-5" />
          ) : (
            <Maximize2 className="size-5" />
          )}
        </Button>
      </div>
      <div id={canvasId} className="min-h-0 min-w-0">
        {expanded && children(true)}
        {!expanded && (
          <p className="blueprint-surface rounded-lg p-4 text-base text-muted-foreground">
            Interactive graph collapsed. The synchronized outline remains available below.
          </p>
        )}
      </div>
      <div className="mt-3 min-w-0">{outline}</div>
    </Card>
  );
}
