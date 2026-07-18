"use client";

import * as React from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";

interface PlannerProcessFlowProps {
  completedSteps?: string[];
}

function IdeaNode({ completed }: { completed: boolean }) {
  return (
    <Card className={`p-3 min-w-[160px] bg-card/80 backdrop-blur-md border-primary/30 ${completed ? "ring-2 ring-accent/40" : ""}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="micro-label text-primary">Input</div>
        {completed && (
          <div className="h-4 w-4 rounded-full bg-accent/20 flex items-center justify-center">
            <Check className="h-2.5 w-2.5 text-accent" />
          </div>
        )}
      </div>
      <div className="font-display font-bold text-sm text-foreground">
        App Idea
      </div>
    </Card>
  );
}

function buildProcessNodes(completedSteps: string[]): Node[] {
  const isComplete = (step: string) => completedSteps.includes(step);

  return [
    {
      id: "idea",
      position: { x: 50, y: 200 },
      data: {
        label: <IdeaNode completed={isComplete("idea")} />,
      },
    },
    {
      id: "provider",
      position: { x: 300, y: 100 },
      data: {
        label: (
          <Card className="p-3 min-w-[160px] bg-card/80 backdrop-blur-md border-secondary/30">
            <div className="micro-label mb-1">Settings</div>
            <div className="font-display font-bold text-sm text-foreground">
              Provider Config
            </div>
          </Card>
        ),
      },
    },
    {
      id: "ai",
      position: { x: 550, y: 200 },
      data: {
        label: (
          <Card className="p-3 min-w-[160px] bg-card/80 backdrop-blur-md border-accent/30">
            <div className="micro-label text-accent mb-1">Process</div>
            <div className="font-display font-bold text-sm text-foreground">
              AI Generation
            </div>
          </Card>
        ),
      },
    },
    {
      id: "brief",
      position: { x: 800, y: 200 },
      data: {
        label: (
          <Card className="p-3 min-w-[160px] bg-card/80 backdrop-blur-md border-primary/30">
            <div className="micro-label text-primary mb-1">Output</div>
            <div className="font-display font-bold text-sm text-foreground">
              Project Brief
            </div>
          </Card>
        ),
      },
    },
    {
      id: "edit",
      position: { x: 1050, y: 100 },
      data: {
        label: (
          <Card className="p-3 min-w-[160px] bg-card/80 backdrop-blur-md border-accent/20">
            <div className="micro-label text-accent mb-1">Refine</div>
            <div className="font-display font-bold text-sm text-foreground">
              Editable Sections
            </div>
          </Card>
        ),
      },
    },
    {
      id: "export",
      position: { x: 1300, y: 200 },
      data: {
        label: (
          <Card className="p-3 min-w-[160px] bg-card/80 backdrop-blur-md border-chart-4/30">
            <div className="micro-label mb-1">Export</div>
            <div className="font-display font-bold text-sm text-foreground">
              Markdown Brief
            </div>
          </Card>
        ),
      },
    },
    {
      id: "prompt",
      position: { x: 1300, y: 320 },
      data: {
        label: (
          <Card className="p-3 min-w-[160px] bg-card/80 backdrop-blur-md border-chart-5/30">
            <div className="micro-label mb-1">Export</div>
            <div className="font-display font-bold text-sm text-foreground">
              Starter Prompt
            </div>
          </Card>
        ),
      },
    },
  ];
}

const processEdges: Edge[] = [
  {
    id: "e-idea-ai",
    source: "idea",
    target: "ai",
    type: "smoothstep",
    animated: true,
    style: { stroke: "var(--primary)", strokeWidth: 2 },
  },
  {
    id: "e-provider-ai",
    source: "provider",
    target: "ai",
    type: "smoothstep",
    animated: true,
    style: { stroke: "var(--primary)", strokeWidth: 2 },
  },
  {
    id: "e-ai-brief",
    source: "ai",
    target: "brief",
    type: "smoothstep",
    animated: true,
    style: { stroke: "var(--accent)", strokeWidth: 2 },
  },
  {
    id: "e-brief-edit",
    source: "brief",
    target: "edit",
    type: "smoothstep",
    style: { stroke: "var(--accent)", strokeWidth: 2 },
  },
  {
    id: "e-edit-export",
    source: "edit",
    target: "export",
    type: "smoothstep",
    style: { stroke: "var(--chart-4)", strokeWidth: 2 },
  },
  {
    id: "e-edit-prompt",
    source: "edit",
    target: "prompt",
    type: "smoothstep",
    style: { stroke: "var(--chart-5)", strokeWidth: 2 },
  },
];

export function PlannerProcessFlow({ completedSteps = [] }: PlannerProcessFlowProps) {
  const processNodes = buildProcessNodes(completedSteps);

  return (
    <div className="blueprint-surface rounded-xl h-[500px] overflow-hidden">
      <ReactFlow nodes={processNodes} edges={processEdges} fitView>
        <Background gap={24} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
