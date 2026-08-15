"use client";

import * as React from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import { CircleCheck } from "lucide-react";

interface PlannerProcessFlowProps {
  availableSteps?: string[];
}

const processSteps = [
  { id: "idea", kind: "Input", label: "App Idea" },
  { id: "provider", kind: "Settings", label: "Provider Config" },
  { id: "ai", kind: "Process", label: "AI Generation" },
  { id: "brief", kind: "Output", label: "Project Brief" },
  { id: "edit", kind: "Refine", label: "Editable Sections" },
  { id: "export", kind: "Export", label: "Markdown Brief" },
  { id: "prompt", kind: "Export", label: "Starter Prompt" },
] as const;

const processConnections = [
  ["idea", "ai"],
  ["provider", "ai"],
  ["ai", "brief"],
  ["brief", "edit"],
  ["edit", "export"],
  ["edit", "prompt"],
] as const;

type ProcessNode = Node<
  { kind: string; label: string; available: boolean; compact: boolean },
  "process"
>;

function ProcessNodeCard({ data }: NodeProps<ProcessNode>) {
  return (
    <article className="planner-flow-node w-48 rounded-xl border border-border bg-card p-4 text-foreground shadow-sm">
      <Handle type="target" position={data.compact ? Position.Top : Position.Left} isConnectable={false} aria-hidden="true" />
      <div className="flex items-center justify-between gap-3">
        <span className="micro-label">{data.kind}</span>
        {data.available && <CircleCheck className="size-5 text-accent" aria-label="Available" />}
      </div>
      <h4 className="mt-2 font-display text-base font-bold leading-tight">{data.label}</h4>
      <p className="mt-1 text-sm font-medium text-muted-foreground">{data.available ? "Available" : "Pending"}</p>
      <Handle type="source" position={data.compact ? Position.Bottom : Position.Right} isConnectable={false} aria-hidden="true" />
    </article>
  );
}

const nodeTypes = { process: ProcessNodeCard };

export function buildProcessGraph(availableSteps: string[], compact = false) {
  const available = new Set(availableSteps);
  const positions = compact
    ? [
        { x: 24, y: 24 },
        { x: 264, y: 24 },
        { x: 144, y: 208 },
        { x: 144, y: 392 },
        { x: 144, y: 576 },
        { x: 24, y: 760 },
        { x: 264, y: 760 },
      ]
    : [
        { x: 24, y: 196 },
        { x: 280, y: 24 },
        { x: 280, y: 300 },
        { x: 536, y: 196 },
        { x: 792, y: 196 },
        { x: 1048, y: 72 },
        { x: 1048, y: 320 },
      ];
  const nodes: ProcessNode[] = processSteps.map((step, index) => ({
    id: step.id,
    type: "process",
    position: positions[index],
    data: { kind: step.kind, label: step.label, available: available.has(step.id), compact },
    ariaLabel: `${step.label}, ${step.kind}, ${available.has(step.id) ? "available" : "pending"}`,
  }));
  const labels = new Map(processSteps.map((step) => [step.id, step.label]));
  const edges: Edge[] = processConnections.map(([source, target], index) => ({
    id: `process-connection-${index}`,
    source,
    target,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed },
    ariaLabel: `${labels.get(source)} to ${labels.get(target)}`,
    interactionWidth: 24,
  }));
  return {
    nodes,
    edges,
    bounds: compact ? { width: 480, height: 944 } : { width: 1264, height: 480 },
  };
}

export function PlannerProcessOutline({ availableSteps = [] }: PlannerProcessFlowProps) {
  const labels = new Map(processSteps.map((step) => [step.id, step.label]));
  const available = new Set(availableSteps);
  return (
    <details open className="planner-flow-outline rounded-lg border border-border bg-background/35 p-3">
      <summary className="flex min-h-11 cursor-pointer items-center text-base font-medium text-foreground">Edit and export system flow outline</summary>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="font-display text-base font-bold">Ordered steps</h4>
          <ol className="mt-2 space-y-1 text-base text-muted-foreground">
            {processSteps.map((step) => (
              <li key={step.id}>
                <span className="text-foreground">{step.label}</span>: {step.kind}; {available.has(step.id) ? "Available" : "Pending"}
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h4 className="font-display text-base font-bold">Connections</h4>
          <ol className="mt-2 space-y-1 text-base text-muted-foreground">
            {processConnections.map(([source, target]) => (
              <li key={`${source}-${target}`}>{labels.get(source)} to {labels.get(target)}</li>
            ))}
          </ol>
        </div>
      </div>
    </details>
  );
}

export function PlannerProcessFlow({ availableSteps = [] }: PlannerProcessFlowProps) {
  const [instance, setInstance] = React.useState<ReactFlowInstance<ProcessNode, Edge> | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const compact = size.width === 0 || size.width < 1280;
  const graph = React.useMemo(() => buildProcessGraph(availableSteps, compact), [availableSteps, compact]);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((current) =>
        Math.abs(current.width - width) < 1 && Math.abs(current.height - height) < 1
          ? current
          : { width, height },
      );
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!instance || size.width === 0 || size.height === 0) return;
    const frame = requestAnimationFrame(() => {
      if (graph.bounds.width + 32 <= size.width && graph.bounds.height + 32 <= size.height) {
        void instance.fitView({ padding: 0.08, minZoom: 1, maxZoom: 1 });
      } else {
        void instance.setViewport({ x: 16, y: 16, zoom: 1 });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [graph, instance, size.height, size.width]);

  return (
    <div ref={containerRef} className="planner-flow blueprint-surface h-[clamp(24rem,60vw,38rem)] min-h-0 overflow-hidden rounded-xl" data-testid="planner-process-flow" data-layout={compact ? "compact" : "wide"}>
      <ReactFlow<ProcessNode, Edge>
        aria-label="Static edit and export system flow"
        nodes={graph.nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        onInit={setInstance}
        defaultViewport={{ x: 16, y: 16, zoom: 1 }}
        minZoom={1}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesReconnectable={false}
        elementsSelectable={false}
        nodesFocusable
        edgesFocusable
        connectOnClick={false}
        panOnDrag
        ariaLabelConfig={{
          "controls.ariaLabel": "Edit and export system flow controls",
          "controls.zoomIn.ariaLabel": "Zoom in edit and export system flow",
          "controls.zoomOut.ariaLabel": "Zoom out edit and export system flow",
          "controls.fitView.ariaLabel": "Fit edit and export system flow to view",
        }}
      >
        <Background gap={24} size={1} />
        <Controls aria-label="Edit and export system flow controls" position="bottom-left" showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
