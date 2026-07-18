"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";

interface ExpandableGraphCardProps {
  title: string;
  eyebrow?: string;
  children: (expanded: boolean) => React.ReactNode;
}

export function ExpandableGraphCard({ title, eyebrow, children }: ExpandableGraphCardProps) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <Card className="paper-card rounded-xl p-3 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div>
          {eyebrow && <div className="micro-label">{eyebrow}</div>}
          <h3 className="text-sm font-medium text-foreground leading-none">{title}</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="h-6 w-6 p-0"
        >
          {expanded ? (
            <Minimize2 className="h-3 w-3" />
          ) : (
            <Maximize2 className="h-3 w-3" />
          )}
        </Button>
      </div>
      <div className="flex-1 min-h-0">
        {expanded ? (
          children(true)
        ) : (
          <div className="blueprint-surface rounded-lg h-full min-h-[120px] flex items-center justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(true)}
              className="text-xs text-muted-foreground"
            >
              <Maximize2 className="h-3 w-3 mr-1" />
              Expand
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
