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
import type { ProjectBrief } from "@/lib/brief-schema";
import { Card } from "@/components/ui/card";

function buildDataModelNodes(
  entities: ProjectBrief["dataModel"]["entities"]
): Node[] {
  return entities.map((entity, i) => ({
    id: entity.name || `entity-${i}`,
    position: { x: (i % 3) * 300, y: Math.floor(i / 3) * 250 },
    data: {
      label: (
        <Card className="p-3 min-w-[220px] bg-card/80 backdrop-blur-md border-accent/20">
          <div className="font-display font-bold text-base text-foreground mb-1">
            {entity.name}
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            {entity.description}
          </p>
          <div className="space-y-0.5">
            {entity.fields.map((field, fi) => (
              <div
                key={fi}
                className="flex gap-2 text-xs font-mono text-muted-foreground"
              >
                <span className="text-accent">{field.name}</span>
                <span className="text-foreground/50">{field.type}</span>
              </div>
            ))}
          </div>
        </Card>
      ),
    },
    type: "default",
  }));
}

function buildDataModelEdges(
  relationships: ProjectBrief["dataModel"]["relationships"]
): Edge[] {
  return relationships.map((rel, i) => ({
    id: `edge-${i}`,
    source: rel.source,
    target: rel.target,
    label: rel.label,
    type: "smoothstep",
    animated: true,
    style: { stroke: "var(--accent)", strokeWidth: 2 },
    labelStyle: {
      fill: "var(--muted-foreground)",
      fontSize: 10,
      fontFamily: "var(--font-code)",
    },
  }));
}

interface DataModelFlowProps {
  dataModel: ProjectBrief["dataModel"];
}

export function DataModelFlow({ dataModel }: DataModelFlowProps) {
  const nodes = React.useMemo(
    () => buildDataModelNodes(dataModel.entities),
    [dataModel.entities]
  );
  const edges = React.useMemo(
    () => buildDataModelEdges(dataModel.relationships),
    [dataModel.relationships]
  );

  if (dataModel.entities.length === 0) {
    return (
      <div className="blueprint-surface rounded-xl h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground text-sm">
          No entities to display. Add entities in the brief editor.
        </p>
      </div>
    );
  }

  return (
    <div className="blueprint-surface rounded-xl h-[500px] overflow-hidden">
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background gap={24} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
