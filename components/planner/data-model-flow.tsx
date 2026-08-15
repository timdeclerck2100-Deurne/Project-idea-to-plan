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
import type { ProjectBrief } from "@/lib/brief-schema";

type Entity = ProjectBrief["dataModel"]["entities"][number];
type EntityNode = Node<
  { entity: Entity; displayName: string; compact: boolean },
  "entity"
>;

export type RelationshipStatus = "shown" | "ambiguous" | "missing";

export interface RelationshipResolution {
  index: number;
  status: RelationshipStatus;
  reason: string;
  sourceId?: string;
  targetId?: string;
}

function entityNodeId(index: number) {
  return `data-entity-${index}`;
}

function normalizedName(name: string) {
  return name.trim();
}

function estimatedNodeHeight(entity: Entity) {
  const descriptionLines = Math.max(1, Math.ceil((entity.description.trim().length || 24) / 32));
  const fieldLines = entity.fields.reduce(
    (total, field) => total + Math.max(1, Math.ceil(`${field.name}: ${field.type}`.length / 30)),
    0,
  );
  return 104 + descriptionLines * 26 + fieldLines * 24;
}

export function buildDataModelGraph(
  dataModel: ProjectBrief["dataModel"],
  compact = false,
): {
  nodes: EntityNode[];
  edges: Edge[];
  relationships: RelationshipResolution[];
  bounds: { width: number; height: number };
} {
  const idsByName = new Map<string, string[]>();
  dataModel.entities.forEach((entity, index) => {
    const name = normalizedName(entity.name);
    if (!name) return;
    idsByName.set(name, [...(idsByName.get(name) ?? []), entityNodeId(index)]);
  });

  const columns = compact ? 1 : 2;
  const nodeWidth = 288;
  const columnGap = 96;
  const rowGap = 88;
  const positions: Array<{ x: number; y: number }> = [];
  let y = 24;
  for (let row = 0; row < Math.ceil(dataModel.entities.length / columns); row += 1) {
    const rowEntities = dataModel.entities.slice(row * columns, row * columns + columns);
    const rowHeight = Math.max(...rowEntities.map(estimatedNodeHeight), 0);
    rowEntities.forEach((_, column) => {
      positions.push({ x: 24 + column * (nodeWidth + columnGap), y });
    });
    y += rowHeight + rowGap;
  }

  const nodes = dataModel.entities.map((entity, index) => {
    const displayName = normalizedName(entity.name) || `Unnamed entity ${index + 1}`;
    return {
      id: entityNodeId(index),
      type: "entity" as const,
      position: positions[index],
      data: { entity, displayName, compact },
      ariaLabel: `${displayName}. ${entity.description.trim() || "No description"}. ${entity.fields.length} fields.`,
    };
  });

  const relationships = dataModel.relationships.map((relationship, index): RelationshipResolution => {
    const sourceName = normalizedName(relationship.source);
    const targetName = normalizedName(relationship.target);
    const sourceIds = sourceName ? idsByName.get(sourceName) ?? [] : [];
    const targetIds = targetName ? idsByName.get(targetName) ?? [] : [];
    const ambiguousEndpoints = [
      sourceIds.length > 1 ? `source “${sourceName}” matches ${sourceIds.length} entities` : "",
      targetIds.length > 1 ? `target “${targetName}” matches ${targetIds.length} entities` : "",
    ].filter(Boolean);

    if (ambiguousEndpoints.length > 0) {
      return { index, status: "ambiguous", reason: `Not shown: ${ambiguousEndpoints.join("; ")}.` };
    }

    const missingEndpoints = [
      sourceIds.length === 0 ? `source “${sourceName || "empty name"}” has no uniquely named entity` : "",
      targetIds.length === 0 ? `target “${targetName || "empty name"}” has no uniquely named entity` : "",
    ].filter(Boolean);
    if (missingEndpoints.length > 0) {
      return { index, status: "missing", reason: `Not shown: ${missingEndpoints.join("; ")}.` };
    }

    return {
      index,
      status: "shown",
      reason: "Shown: both endpoints resolve to exactly one entity.",
      sourceId: sourceIds[0],
      targetId: targetIds[0],
    };
  });

  const edges = relationships.flatMap((resolution) => {
    if (resolution.status !== "shown" || !resolution.sourceId || !resolution.targetId) return [];
    const relationship = dataModel.relationships[resolution.index];
    const label = relationship.label.trim() || relationship.type.trim() || "Relationship";
    return [{
      id: `data-relationship-${resolution.index}`,
      source: resolution.sourceId,
      target: resolution.targetId,
      label,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed },
      ariaLabel: `${normalizedName(relationship.source)} to ${normalizedName(relationship.target)}: ${label}`,
      interactionWidth: 24,
    } satisfies Edge];
  });

  const rows = Math.ceil(dataModel.entities.length / columns);
  return {
    nodes,
    edges,
    relationships,
    bounds: {
      width: 48 + Math.min(columns, dataModel.entities.length) * nodeWidth + Math.max(0, Math.min(columns, dataModel.entities.length) - 1) * columnGap,
      height: rows ? y - rowGap + 24 : 0,
    },
  };
}

function EntityNodeCard({ data }: NodeProps<EntityNode>) {
  return (
    <article className="planner-flow-node w-[18rem] rounded-xl border border-border bg-card p-4 text-foreground shadow-sm">
      <Handle type="target" position={data.compact ? Position.Top : Position.Left} isConnectable={false} aria-hidden="true" />
      <h4 className="font-display text-base font-bold leading-tight">{data.displayName}</h4>
      <p className="mt-2 break-words text-base leading-relaxed text-muted-foreground">
        {data.entity.description.trim() || "No description provided."}
      </p>
      {data.entity.fields.length > 0 && (
        <dl className="mt-3 space-y-1 font-mono text-sm">
          {data.entity.fields.map((field, index) => (
            <div key={`${field.name}-${index}`} className="flex flex-wrap gap-x-2">
              <dt className="break-words text-accent">{field.name.trim() || "Unnamed field"}</dt>
              <dd className="break-words text-muted-foreground">{field.type.trim() || "Unspecified type"}</dd>
            </div>
          ))}
        </dl>
      )}
      <Handle type="source" position={data.compact ? Position.Bottom : Position.Right} isConnectable={false} aria-hidden="true" />
    </article>
  );
}

const nodeTypes = { entity: EntityNodeCard };

function useContainerSize() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });

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

  return { containerRef, size };
}

export function DataModelOutline({ dataModel }: { dataModel: ProjectBrief["dataModel"] }) {
  const { relationships } = buildDataModelGraph(dataModel);
  const shownCount = relationships.filter(({ status }) => status === "shown").length;

  return (
    <details open className="planner-flow-outline rounded-lg border border-border bg-background/35 p-3">
      <summary className="flex min-h-11 cursor-pointer items-center font-medium text-foreground">
        Data model outline ({dataModel.entities.length} entities, {shownCount} of {relationships.length} relationships shown)
      </summary>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="font-display text-base font-bold">Entities</h4>
          {dataModel.entities.length ? (
            <ol className="mt-2 space-y-3">
              {dataModel.entities.map((entity, index) => (
                <li key={entityNodeId(index)}>
                  <p className="text-base font-medium text-foreground">{normalizedName(entity.name) || `Unnamed entity ${index + 1}`}</p>
                  <p className="text-base leading-relaxed text-muted-foreground">{entity.description.trim() || "No description provided."}</p>
                  {entity.fields.length > 0 && (
                    <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-sm text-muted-foreground">
                      {entity.fields.map((field, fieldIndex) => (
                        <li key={`${field.name}-${fieldIndex}`}>{field.name.trim() || "Unnamed field"}: {field.type.trim() || "Unspecified type"}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          ) : <p className="mt-2 text-base text-muted-foreground">No entities defined.</p>}
        </div>
        <div>
          <h4 className="font-display text-base font-bold">Relationships</h4>
          {dataModel.relationships.length ? (
            <ol className="mt-2 space-y-3 text-base text-muted-foreground">
              {dataModel.relationships.map((relationship, index) => {
                const resolution = relationships[index];
                return (
                  <li key={`outline-relationship-${index}`}>
                    <p>
                      <span className="text-foreground">{normalizedName(relationship.source) || "Unnamed entity"}</span>
                      {" to "}<span className="text-foreground">{normalizedName(relationship.target) || "Unnamed entity"}</span>
                      {": "}{relationship.label.trim() || relationship.type.trim() || "Relationship"}
                    </p>
                    <p><strong className="capitalize text-foreground">{resolution.status}</strong>. {resolution.reason}</p>
                  </li>
                );
              })}
            </ol>
          ) : <p className="mt-2 text-base text-muted-foreground">No relationships defined.</p>}
        </div>
      </div>
    </details>
  );
}

interface DataModelFlowProps {
  dataModel: ProjectBrief["dataModel"];
}

export function DataModelFlow({ dataModel }: DataModelFlowProps) {
  const [instance, setInstance] = React.useState<ReactFlowInstance<EntityNode, Edge> | null>(null);
  const { containerRef, size } = useContainerSize();
  const compact = size.width === 0 || size.width < 760;
  const graph = React.useMemo(() => buildDataModelGraph(dataModel, compact), [dataModel, compact]);

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

  if (graph.nodes.length === 0) {
    return (
      <div className="planner-flow blueprint-surface flex min-h-[clamp(16rem,45vw,28rem)] items-center justify-center rounded-xl p-4">
        <p className="text-base text-muted-foreground">No entities to display. Add entities in the brief editor.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="planner-flow blueprint-surface h-[clamp(24rem,60vw,38rem)] min-h-0 overflow-hidden rounded-xl" data-testid="data-model-flow" data-layout={compact ? "compact" : "wide"}>
      <ReactFlow<EntityNode, Edge>
        aria-label={`Static data model diagram. ${graph.edges.length} of ${graph.relationships.length} relationships shown.`}
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
          "controls.ariaLabel": "Data model diagram controls",
          "controls.zoomIn.ariaLabel": "Zoom in data model diagram",
          "controls.zoomOut.ariaLabel": "Zoom out data model diagram",
          "controls.fitView.ariaLabel": "Fit data model diagram to view",
        }}
      >
        <Background gap={24} size={1} />
        <Controls aria-label="Data model diagram controls" position="bottom-left" showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
