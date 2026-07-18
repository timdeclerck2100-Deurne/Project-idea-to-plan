"use client";

import * as React from "react";
import {
  DragDropProvider,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/react";
import { useSortable, isSortable } from "@dnd-kit/react/sortable";
import { arrayMove, move } from "@dnd-kit/helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, GripVertical, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Roadmap, BuildPhase } from "@/lib/brief-schema";

export interface RoadmapCardProps {
  roadmap: Roadmap;
  onChange: (roadmap: Roadmap) => void;
  assistant?: React.ReactNode;
}

type ActiveDrag =
  | { kind: "badge"; text: string }
  | { kind: "milestone"; name: string }
  | null;

type BadgeInfo = { text: string; badgeType: "goal" | "deliverable" };

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function badgeId(group: string, type: "goal" | "deliverable", index: number) {
  return `${group}::${type}::${index}`;
}

function buildItems(roadmap: Roadmap): Record<string, string[]> {
  const items: Record<string, string[]> = {};
  items["initial"] = [
    ...roadmap.initialPhase.goals.map((_, i) => badgeId("initial", "goal", i)),
    ...roadmap.initialPhase.deliverables.map((_, i) =>
      badgeId("initial", "deliverable", i)
    ),
  ];
  roadmap.milestones.forEach((m, mi) => {
    const g = `milestone-${mi}`;
    items[g] = [
      ...m.goals.map((_, i) => badgeId(g, "goal", i)),
      ...m.deliverables.map((_, i) => badgeId(g, "deliverable", i)),
    ];
  });
  return items;
}

function buildBadgeMap(roadmap: Roadmap): Map<string, BadgeInfo> {
  const map = new Map<string, BadgeInfo>();
  roadmap.initialPhase.goals.forEach((text, i) => {
    map.set(badgeId("initial", "goal", i), { text, badgeType: "goal" });
  });
  roadmap.initialPhase.deliverables.forEach((text, i) => {
    map.set(badgeId("initial", "deliverable", i), {
      text,
      badgeType: "deliverable",
    });
  });
  roadmap.milestones.forEach((m, mi) => {
    const g = `milestone-${mi}`;
    m.goals.forEach((text, i) => {
      map.set(badgeId(g, "goal", i), { text, badgeType: "goal" });
    });
    m.deliverables.forEach((text, i) => {
      map.set(badgeId(g, "deliverable", i), {
        text,
        badgeType: "deliverable",
      });
    });
  });
  return map;
}

function itemsToRoadmap(
  newItems: Record<string, string[]>,
  roadmap: Roadmap,
  badgeMap: Map<string, BadgeInfo>
): Roadmap {
  const resolve = (ids: string[]) =>
    ids
      .map((id) => badgeMap.get(id))
      .filter((b): b is BadgeInfo => b !== undefined);

  const initial = newItems["initial"] ?? [];
  const initialResolved = resolve(initial);

  const milestones = roadmap.milestones.map((m, i) => {
    const mi = resolve(newItems[`milestone-${i}`] ?? []);
    return {
      name: m.name,
      goals: mi.filter((b) => b.badgeType === "goal").map((b) => b.text),
      deliverables: mi
        .filter((b) => b.badgeType === "deliverable")
        .map((b) => b.text),
    };
  });

  return {
    initialPhase: {
      name: roadmap.initialPhase.name,
      goals: initialResolved
        .filter((b) => b.badgeType === "goal")
        .map((b) => b.text),
      deliverables: initialResolved
        .filter((b) => b.badgeType === "deliverable")
        .map((b) => b.text),
    },
    milestones,
  };
}

/* ─── Badge Chip (draggable) ─────────────────────────────────────────────── */

function BadgeChip({
  id,
  text,
  badgeType,
  group,
  onRemove,
}: {
  id: string;
  text: string;
  badgeType: "goal" | "deliverable";
  group: string;
  onRemove: () => void;
}) {
  const { ref, isDragging } = useDraggable({
    id,
    data: { kind: "badge", text, badgeType, group },
    type: "badge",
  });

  return (
    <div ref={ref} className="group/chip inline-flex">
      <Badge
        variant="secondary"
        className={cn(
          "text-xs cursor-grab active:cursor-grabbing transition-opacity",
          isDragging && "opacity-30"
        )}
      >
        {text}
        <button
          type="button"
          aria-label={`Remove ${badgeType} ${text}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 text-muted-foreground opacity-0 transition-colors hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover/chip:opacity-100 group-focus-within/chip:opacity-100"
        >
          &times;
        </button>
      </Badge>
    </div>
  );
}

/* ─── Badge Drop Zone ────────────────────────────────────────────────────── */

function BadgeDropZone({
  groupId,
  children,
}: {
  groupId: string;
  children: React.ReactNode;
}) {
  const { ref, isDropTarget } = useDroppable({
    id: groupId,
    accept: "badge",
  });

  return (
    <div
      ref={ref}
      className={cn(
        "min-h-[36px] rounded-lg p-1.5 transition-all duration-200",
        isDropTarget && "bg-accent/10 ring-2 ring-accent/30 ring-inset"
      )}
    >
      {children}
    </div>
  );
}

/* ─── Phase Badge Editor ─────────────────────────────────────────────────── */

function PhaseBadges({
  phase,
  group,
  roadmap,
  onChange,
}: {
  phase: BuildPhase;
  group: string;
  roadmap: Roadmap;
  onChange: (roadmap: Roadmap) => void;
}) {
  const [newGoal, setNewGoal] = React.useState("");
  const [newDeliverable, setNewDeliverable] = React.useState("");

  const update = (patch: Partial<BuildPhase>) => {
    const updated = { ...phase, ...patch };
    if (group === "initial") {
      onChange({ ...roadmap, initialPhase: updated });
    } else {
      const idx = parseInt(group.replace("milestone-", ""));
      const milestones = [...roadmap.milestones];
      milestones[idx] = updated;
      onChange({ ...roadmap, milestones });
    }
  };

  return (
    <div className="min-w-0 space-y-1.5">
      {phase.goals.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {phase.goals.map((text, i) => (
            <BadgeChip
              key={`${group}-g-${i}`}
              id={badgeId(group, "goal", i)}
              text={text}
              badgeType="goal"
              group={group}
              onRemove={() =>
                update({ goals: phase.goals.filter((_, j) => j !== i) })
              }
            />
          ))}
        </div>
      )}

      {phase.deliverables.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {phase.deliverables.map((text, i) => (
            <BadgeChip
              key={`${group}-d-${i}`}
              id={badgeId(group, "deliverable", i)}
              text={text}
              badgeType="deliverable"
              group={group}
              onRemove={() =>
                update({
                  deliverables: phase.deliverables.filter((_, j) => j !== i),
                })
              }
            />
          ))}
        </div>
      )}

      <div className="flex min-w-0 flex-wrap gap-1.5">
        <Input
          value={newGoal}
          onChange={(e) => setNewGoal(e.target.value)}
          placeholder="Add goal..."
          className="h-7 min-w-36 flex-1 text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter" && newGoal.trim()) {
              e.preventDefault();
              update({ goals: [...phase.goals, newGoal.trim()] });
              setNewGoal("");
            }
          }}
        />
        <Input
          value={newDeliverable}
          onChange={(e) => setNewDeliverable(e.target.value)}
          placeholder="Add deliverable..."
          className="h-7 min-w-36 flex-1 text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter" && newDeliverable.trim()) {
              e.preventDefault();
              update({
                deliverables: [...phase.deliverables, newDeliverable.trim()],
              });
              setNewDeliverable("");
            }
          }}
        />
      </div>
    </div>
  );
}

/* ─── Milestone Card (sortable) ──────────────────────────────────────────── */

function MilestoneCard({
  milestone,
  index,
  total,
  roadmap,
  onChange,
}: {
  milestone: BuildPhase;
  index: number;
  total: number;
  roadmap: Roadmap;
  onChange: (roadmap: Roadmap) => void;
}) {
  const group = `milestone-${index}`;

  const {
    ref: sortableRef,
    handleRef,
    isDragging: isDragging_,
    isDropTarget,
  } = useSortable({
    id: `sortable-${group}`,
    index,
    group: "milestones",
    type: "milestone",
    accept: "milestone",
  });

  const setName = (name: string) => {
    const ms = [...roadmap.milestones];
    ms[index] = { ...ms[index], name };
    onChange({ ...roadmap, milestones: ms });
  };

  const remove = () => {
    onChange({
      ...roadmap,
      milestones: roadmap.milestones.filter((_, i) => i !== index),
    });
  };

  const moveMilestone = (to: number) => {
    onChange({
      ...roadmap,
      milestones: arrayMove(roadmap.milestones, index, to),
    });
  };

  return (
    <div
      ref={sortableRef}
      className={cn(
        "min-w-0 rounded-xl border border-border/50 bg-card/30 p-3 transition-all duration-200",
        isDragging_ && "opacity-40 scale-[0.98]",
        isDropTarget && "ring-2 ring-accent/30"
      )}
    >
      <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
        <div
          ref={handleRef}
          aria-hidden="true"
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider shrink-0">
          {index + 1}
        </span>
        <Input
          value={milestone.name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`Milestone ${index + 1}`}
          className="h-7 min-w-36 flex-1 text-xs"
        />
        <div className="flex shrink-0 items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Move ${milestone.name || `milestone ${index + 1}`} earlier`}
            onClick={() => moveMilestone(index - 1)}
            disabled={index === 0}
            className="h-7 w-7 rounded-lg p-0"
          >
            <ArrowUp />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Move ${milestone.name || `milestone ${index + 1}`} later`}
            onClick={() => moveMilestone(index + 1)}
            disabled={index === total - 1}
            className="h-7 w-7 rounded-lg p-0"
          >
            <ArrowDown />
          </Button>
        </div>
        {total > 1 && (
          <button
            type="button"
            aria-label={`Remove ${milestone.name || `milestone ${index + 1}`}`}
            onClick={remove}
            className="shrink-0 px-1 text-xs text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            &times;
          </button>
        )}
      </div>

      <BadgeDropZone groupId={group}>
        <PhaseBadges
          phase={milestone}
          group={group}
          roadmap={roadmap}
          onChange={onChange}
        />
      </BadgeDropZone>
    </div>
  );
}

/* ─── Roadmap Card ───────────────────────────────────────────────────────── */

export function RoadmapCard({ roadmap, onChange, assistant }: RoadmapCardProps) {
  const [activeItem, setActiveItem] = React.useState<ActiveDrag>(null);

  const items = React.useMemo(() => buildItems(roadmap), [roadmap]);
  const badgeMap = React.useMemo(() => buildBadgeMap(roadmap), [roadmap]);

  const phaseGroups = React.useMemo(
    () => ["initial", ...roadmap.milestones.map((_, i) => `milestone-${i}`)],
    [roadmap.milestones]
  );

  function onDragStart(event: DragStartEvent) {
    const src = event.operation?.source;
    if (!src) return;

    if (isSortable(src)) {
      const match = (src.id as string).match(/milestone-(\d+)/);
      const name = match ? roadmap.milestones[+match[1]]?.name ?? "" : "";
      setActiveItem({ kind: "milestone", name });
    } else if (src.data?.kind === "badge") {
      setActiveItem({ kind: "badge", text: src.data.text });
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const { operation, canceled } = event;
    if (canceled || !operation?.source || !operation?.target) {
      setActiveItem(null);
      return;
    }

    const { source, target } = operation;

    /* Milestone reorder */
    if (isSortable(source) && isSortable(target)) {
      const from = source.sortable.initialIndex;
      const to = target.sortable.index;
      if (from !== to) {
        onChange({
          ...roadmap,
          milestones: arrayMove(roadmap.milestones, from, to),
        });
      }
      setActiveItem(null);
      return;
    }

    /* Badge cross-container move */
    if (source.data?.kind === "badge") {
      const toGroup = target.id as string;
      if (!phaseGroups.includes(toGroup)) {
        setActiveItem(null);
        return;
      }

      try {
        const newItems = move(items, event);
        const newRoadmap = itemsToRoadmap(newItems, roadmap, badgeMap);
        onChange(newRoadmap);
      } catch {
        /* noop – incompatible drop target */
      }
    }

    setActiveItem(null);
  }

  return (
    <DragDropProvider onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <Card className="min-w-0 animate-fade-up">
        <CardHeader className="pb-3">
          <CardTitle>Roadmap</CardTitle>
        </CardHeader>

        <CardContent className="min-w-0 space-y-4">
          {/* ── Initial Phase ─────────────────────── */}
          <div className="space-y-2">
            <div className="micro-label">Foundation</div>
            <Input
              value={roadmap.initialPhase.name}
              onChange={(e) =>
                onChange({
                  ...roadmap,
                  initialPhase: {
                    ...roadmap.initialPhase,
                    name: e.target.value,
                  },
                })
              }
              placeholder="Phase name"
              className="h-8 text-sm"
            />
            <BadgeDropZone groupId="initial">
              <PhaseBadges
                phase={roadmap.initialPhase}
                group="initial"
                roadmap={roadmap}
                onChange={onChange}
              />
            </BadgeDropZone>
          </div>

          {/* ── Milestones ───────────────────────── */}
          {roadmap.milestones.length > 0 && (
            <div className="space-y-2">
              <div className="micro-label">Milestones</div>
              <div className="space-y-2">
                {roadmap.milestones.map((ms, i) => (
                  <MilestoneCard
                    key={i}
                    milestone={ms}
                    index={i}
                    total={roadmap.milestones.length}
                    roadmap={roadmap}
                    onChange={onChange}
                  />
                ))}
              </div>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onChange({
                ...roadmap,
                milestones: [
                  ...roadmap.milestones,
                  { name: "", goals: [], deliverables: [] },
                ],
              })
            }
            className="w-full"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Milestone
          </Button>

          {assistant && <div className="min-w-0">{assistant}</div>}
        </CardContent>
      </Card>

      <DragOverlay dropAnimation={null}>
        {activeItem?.kind === "badge" && (
          <Badge variant="secondary" className="text-xs shadow-lg opacity-80">
            {activeItem.text}
          </Badge>
        )}
        {activeItem?.kind === "milestone" && (
          <div className="rounded-xl border border-border bg-card p-3 shadow-lg opacity-80 text-sm font-medium flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            {activeItem.name || "New Milestone"}
          </div>
        )}
      </DragOverlay>
    </DragDropProvider>
  );
}
