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
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { arrayMove, move } from "@dnd-kit/helpers";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  GripVertical,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { BuildPhase, Roadmap } from "@/lib/brief-schema";
import { cn } from "@/lib/utils";

export interface RoadmapCardProps {
  roadmap: Roadmap;
  onChange: (roadmap: Roadmap) => void;
  assistant?: React.ReactNode;
}

export type RoadmapItemType = "goal" | "deliverable";

type ActiveDrag =
  | { kind: "item"; text: string }
  | { kind: "milestone"; name: string }
  | null;

type PhaseIdentity = {
  id: string;
  goalIds: string[];
  deliverableIds: string[];
  snapshot: BuildPhase;
};

type RoadmapIdentities = {
  initial: PhaseIdentity;
  milestones: PhaseIdentity[];
  next: number;
};

type ItemInfo = {
  text: string;
  itemType: RoadmapItemType;
};

type RemovalRecovery = {
  before: Roadmap;
  after: Roadmap;
  identities: RoadmapIdentities;
  focusId: string;
  message: string;
};

function copyPhase(phase: BuildPhase): BuildPhase {
  return { ...phase, goals: [...phase.goals], deliverables: [...phase.deliverables] };
}

function phaseSignature(phase: BuildPhase) {
  return JSON.stringify([phase.name, phase.goals, phase.deliverables]);
}

function phaseAt(roadmap: Roadmap, phaseIndex: number): BuildPhase {
  return phaseIndex === 0
    ? roadmap.initialPhase
    : roadmap.milestones[phaseIndex - 1];
}

function replacePhase(
  roadmap: Roadmap,
  phaseIndex: number,
  phase: BuildPhase,
): Roadmap {
  if (phaseIndex === 0) return { ...roadmap, initialPhase: phase };
  const milestones = [...roadmap.milestones];
  milestones[phaseIndex - 1] = phase;
  return { ...roadmap, milestones };
}

export function moveRoadmapMilestone(
  roadmap: Roadmap,
  from: number,
  to: number,
): Roadmap {
  if (from === to || from < 0 || to < 0 || from >= roadmap.milestones.length || to >= roadmap.milestones.length) {
    return roadmap;
  }
  return { ...roadmap, milestones: arrayMove(roadmap.milestones, from, to) };
}

export function removeRoadmapItem(
  roadmap: Roadmap,
  itemType: RoadmapItemType,
  phaseIndex: number,
  itemIndex: number,
): Roadmap {
  const phase = phaseAt(roadmap, phaseIndex);
  const key = itemType === "goal" ? "goals" : "deliverables";
  return replacePhase(roadmap, phaseIndex, {
    ...phase,
    [key]: phase[key].filter((_, index) => index !== itemIndex),
  });
}

export function moveRoadmapItem(
  roadmap: Roadmap,
  itemType: RoadmapItemType,
  fromPhaseIndex: number,
  fromItemIndex: number,
  toPhaseIndex: number,
  toItemIndex?: number,
): Roadmap {
  const key = itemType === "goal" ? "goals" : "deliverables";
  const sourcePhase = phaseAt(roadmap, fromPhaseIndex);
  const value = sourcePhase[key][fromItemIndex];
  if (value === undefined) return roadmap;

  if (fromPhaseIndex === toPhaseIndex) {
    const destination = toItemIndex ?? sourcePhase[key].length - 1;
    if (destination < 0 || destination >= sourcePhase[key].length || destination === fromItemIndex) {
      return roadmap;
    }
    return replacePhase(roadmap, fromPhaseIndex, {
      ...sourcePhase,
      [key]: arrayMove(sourcePhase[key], fromItemIndex, destination),
    });
  }

  const targetPhase = phaseAt(roadmap, toPhaseIndex);
  const sourceValues = sourcePhase[key].filter((_, index) => index !== fromItemIndex);
  const targetValues = [...targetPhase[key]];
  const destination = Math.max(0, Math.min(toItemIndex ?? targetValues.length, targetValues.length));
  targetValues.splice(destination, 0, value);

  let next = replacePhase(roadmap, fromPhaseIndex, { ...sourcePhase, [key]: sourceValues });
  next = replacePhase(next, toPhaseIndex, { ...targetPhase, [key]: targetValues });
  return next;
}

function itemLabel(
  itemType: RoadmapItemType,
  text: string,
  phaseIndex: number,
  itemIndex: number,
) {
  return `${itemType} ${text || "with an empty value"}, phase ${phaseIndex + 1}, item ${itemIndex + 1}`;
}

function identityList(identity: PhaseIdentity, itemType: RoadmapItemType) {
  return itemType === "goal" ? identity.goalIds : identity.deliverableIds;
}

function createPhaseIdentity(
  phase: BuildPhase,
  prefix: string,
  counter: { value: number },
): PhaseIdentity {
  const nextId = () => `${prefix}-${counter.value++}`;
  return {
    id: nextId(),
    goalIds: phase.goals.map(nextId),
    deliverableIds: phase.deliverables.map(nextId),
    snapshot: copyPhase(phase),
  };
}

function createIdentities(roadmap: Roadmap, prefix: string): RoadmapIdentities {
  const counter = { value: 0 };
  return {
    initial: createPhaseIdentity(roadmap.initialPhase, prefix, counter),
    milestones: roadmap.milestones.map((phase) => createPhaseIdentity(phase, prefix, counter)),
    next: counter.value,
  };
}

function reconcileItemIds(
  previousValues: string[],
  previousIds: string[],
  values: string[],
  prefix: string,
  counter: { value: number },
) {
  const available = new Map<string, string[]>();
  previousValues.forEach((value, index) => {
    const ids = available.get(value) ?? [];
    ids.push(previousIds[index]);
    available.set(value, ids);
  });
  return values.map((value) => available.get(value)?.shift() ?? `${prefix}-${counter.value++}`);
}

function overlapCount(previous: string[], next: string[]) {
  const available = new Map<string, number>();
  previous.forEach((value) => {
    if (value) available.set(value, (available.get(value) ?? 0) + 1);
  });
  return next.reduce((count, value) => {
    const remaining = available.get(value) ?? 0;
    if (!value || remaining === 0) return count;
    available.set(value, remaining - 1);
    return count + 1;
  }, 0);
}

function phaseCorrespondenceScore(previous: BuildPhase, next: BuildPhase, samePosition: boolean) {
  if (phaseSignature(previous) === phaseSignature(next)) return Number.MAX_SAFE_INTEGER;
  const isSubsequence = (shorter: string[], longer: string[]) => {
    let index = 0;
    longer.forEach((value) => {
      if (value === shorter[index]) index += 1;
    });
    return index === shorter.length;
  };
  const insertionOrRemoval = (left: string[], right: string[]) =>
    isSubsequence(left, right) || isSubsequence(right, left);
  const sameName = Boolean(previous.name) && previous.name === next.name;
  const structuralEdit = samePosition
    && previous.name === next.name
    && ((JSON.stringify(previous.deliverables) === JSON.stringify(next.deliverables)
      && insertionOrRemoval(previous.goals, next.goals))
      || (JSON.stringify(previous.goals) === JSON.stringify(next.goals)
        && insertionOrRemoval(previous.deliverables, next.deliverables)));
  const goalOverlap = overlapCount(previous.goals, next.goals);
  const deliverableOverlap = overlapCount(previous.deliverables, next.deliverables);
  const itemOverlap = goalOverlap + deliverableOverlap;

  // One shared value is only correspondence when another independent signal
  // corroborates it. This avoids assigning generic-item ties by array order.
  if (!structuralEdit && itemOverlap < 2 && !(sameName && itemOverlap > 0)) return 0;
  return itemOverlap * 4
    + (sameName ? 2 : 0)
    + (goalOverlap > 0 && deliverableOverlap > 0 ? 1 : 0)
    + (structuralEdit ? 8 : 0);
}

function reconcilePhaseIdentity(
  identity: PhaseIdentity | undefined,
  phase: BuildPhase,
  prefix: string,
  counter: { value: number },
) {
  if (!identity) return createPhaseIdentity(phase, prefix, counter);
  return {
    ...identity,
    goalIds: reconcileItemIds(identity.snapshot.goals, identity.goalIds, phase.goals, prefix, counter),
    deliverableIds: reconcileItemIds(
      identity.snapshot.deliverables,
      identity.deliverableIds,
      phase.deliverables,
      prefix,
      counter,
    ),
    snapshot: copyPhase(phase),
  };
}

export function reconcileRoadmapIdentities(
  identities: RoadmapIdentities,
  roadmap: Roadmap,
  prefix: string,
) {
  const counter = { value: identities.next };
  const initial = reconcilePhaseIdentity(
    phaseCorrespondenceScore(identities.initial.snapshot, roadmap.initialPhase, true) > 0
      ? identities.initial
      : undefined,
    roadmap.initialPhase,
    prefix,
    counter,
  );
  const unused = new Set(identities.milestones.map((_, index) => index));
  const exact = new Map<string, number[]>();
  identities.milestones.forEach((identity, index) => {
    const matches = exact.get(phaseSignature(identity.snapshot)) ?? [];
    matches.push(index);
    exact.set(phaseSignature(identity.snapshot), matches);
  });
  const matches = roadmap.milestones.map((phase) => {
    const exactIndex = exact.get(phaseSignature(phase))?.find((index) => unused.has(index));
    if (exactIndex !== undefined) {
      unused.delete(exactIndex);
      return exactIndex;
    }
    return undefined;
  });
  const unmatchedNext = matches.flatMap((match, index) => match === undefined ? [index] : []);
  const scores = new Map<string, number>();
  unmatchedNext.forEach((nextIndex) => {
    unused.forEach((previousIndex) => {
      scores.set(
        `${previousIndex}:${nextIndex}`,
        phaseCorrespondenceScore(
          identities.milestones[previousIndex].snapshot,
          roadmap.milestones[nextIndex],
          previousIndex === nextIndex,
        ),
      );
    });
  });
  const proposals = unmatchedNext.flatMap((nextIndex) => {
    const rankedPrevious = [...unused]
      .map((previousIndex) => ({ previousIndex, score: scores.get(`${previousIndex}:${nextIndex}`) ?? 0 }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score);
    if (rankedPrevious.length === 0 || rankedPrevious[0].score === rankedPrevious[1]?.score) return [];
    const best = rankedPrevious[0];
    const rankedNext = unmatchedNext
      .map((candidateIndex) => ({ candidateIndex, score: scores.get(`${best.previousIndex}:${candidateIndex}`) ?? 0 }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score);
    if (rankedNext[0]?.candidateIndex !== nextIndex || rankedNext[0].score === rankedNext[1]?.score) return [];
    return [{ nextIndex, previousIndex: best.previousIndex }];
  });
  proposals.forEach(({ nextIndex, previousIndex }) => {
    matches[nextIndex] = previousIndex;
    unused.delete(previousIndex);
  });
  const milestones = roadmap.milestones.map((phase, index) =>
    reconcilePhaseIdentity(
      matches[index] === undefined ? undefined : identities.milestones[matches[index]],
      phase,
      prefix,
      counter,
    ),
  );
  return { initial, milestones, next: counter.value };
}

export function canCommitRoadmapDrag(startedRoadmap: Roadmap | null, roadmap: Roadmap) {
  return startedRoadmap === roadmap;
}

function identitiesWithSnapshots(identities: RoadmapIdentities, roadmap: Roadmap) {
  return {
    ...identities,
    initial: { ...identities.initial, snapshot: copyPhase(roadmap.initialPhase) },
    milestones: identities.milestones.map((identity, index) => ({
      ...identity,
      snapshot: copyPhase(roadmap.milestones[index]),
    })),
  };
}

function buildDragItems(identities: RoadmapIdentities) {
  return Object.fromEntries(
    [identities.initial, ...identities.milestones].map((identity) => [
      identity.id,
      [...identity.goalIds, ...identity.deliverableIds],
    ]),
  );
}

function buildItemMap(roadmap: Roadmap, identities: RoadmapIdentities) {
  const map = new Map<string, ItemInfo>();
  [identities.initial, ...identities.milestones].forEach((identity, phaseIndex) => {
    const phase = phaseAt(roadmap, phaseIndex);
    phase.goals.forEach((text, index) => {
      map.set(identity.goalIds[index], { text, itemType: "goal" });
    });
    phase.deliverables.forEach((text, index) => {
      map.set(identity.deliverableIds[index], { text, itemType: "deliverable" });
    });
  });
  return map;
}

function dragItemsToRoadmap(
  items: Record<string, string[]>,
  roadmap: Roadmap,
  identities: RoadmapIdentities,
  itemMap: Map<string, ItemInfo>,
) {
  const nextIdentities = [identities.initial, ...identities.milestones].map((identity) => ({
    ...identity,
    goalIds: [...identity.goalIds],
    deliverableIds: [...identity.deliverableIds],
  }));
  let nextRoadmap = roadmap;

  nextIdentities.forEach((identity, phaseIndex) => {
    const orderedIds = items[identity.id] ?? [];
    identity.goalIds = orderedIds.filter((id) => itemMap.get(id)?.itemType === "goal");
    identity.deliverableIds = orderedIds.filter(
      (id) => itemMap.get(id)?.itemType === "deliverable",
    );
    const phase = phaseAt(nextRoadmap, phaseIndex);
    nextRoadmap = replacePhase(nextRoadmap, phaseIndex, {
      ...phase,
      goals: identity.goalIds.map((id) => itemMap.get(id)?.text ?? ""),
      deliverables: identity.deliverableIds.map((id) => itemMap.get(id)?.text ?? ""),
    });
  });

  return {
    roadmap: nextRoadmap,
    identities: {
      initial: nextIdentities[0],
      milestones: nextIdentities.slice(1),
      next: identities.next,
    },
  };
}

function ItemActions({
  id,
  text,
  itemType,
  itemIndex,
  phaseIndex,
  phaseCount,
  itemCount,
  onMove,
  onRemove,
  open,
  onOpenChange,
}: {
  id: string;
  text: string;
  itemType: RoadmapItemType;
  itemIndex: number;
  phaseIndex: number;
  phaseCount: number;
  itemCount: number;
  onMove: (toPhaseIndex: number, toItemIndex?: number) => void;
  onRemove: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const label = itemLabel(itemType, text, phaseIndex, itemIndex);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const runAction = (action: () => void) => {
    action();
    onOpenChange(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const actions = [
    {
      label: `Move ${label} earlier within phase`,
      icon: ArrowUp,
      disabled: itemIndex === 0,
      action: () => onMove(phaseIndex, itemIndex - 1),
    },
    {
      label: `Move ${label} later within phase`,
      icon: ArrowDown,
      disabled: itemIndex === itemCount - 1,
      action: () => onMove(phaseIndex, itemIndex + 1),
    },
    {
      label: `Move ${label} to previous phase`,
      icon: ArrowLeft,
      disabled: phaseIndex === 0,
      action: () => onMove(phaseIndex - 1),
    },
    {
      label: `Move ${label} to next phase`,
      icon: ArrowRight,
      disabled: phaseIndex === phaseCount - 1,
      action: () => onMove(phaseIndex + 1),
    },
  ];

  return (
    <div
      data-roadmap-actions
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onOpenChange(false);
          requestAnimationFrame(() => triggerRef.current?.focus());
        }
      }}
      className="group/actions relative shrink-0"
    >
      <button
        ref={triggerRef}
        type="button"
        data-roadmap-action-trigger={id}
        aria-label={`Actions for ${label}`}
        aria-expanded={open}
        title={`Actions for ${label}`}
        onClick={() => onOpenChange(!open)}
        className="flex size-11 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-[color,background-color,box-shadow] hover:bg-background/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MoreHorizontal aria-hidden="true" className="size-4" />
      </button>
      {open && <div data-roadmap-action-toolbar className="absolute right-0 z-20 mt-1 flex rounded-xl border border-border bg-card p-1 shadow-lg">
        {actions.map(({ label: actionLabel, icon: Icon, disabled, action }) => (
          <Button
            key={actionLabel}
            type="button"
            variant="ghost"
            size="icon"
            aria-label={actionLabel}
            title={actionLabel}
            disabled={disabled}
            onClick={() => runAction(action)}
            className="rounded-lg"
          >
            <Icon aria-hidden="true" />
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Remove ${label}`}
          title={`Remove ${label}`}
          onClick={() => runAction(onRemove)}
          className="rounded-lg text-muted-foreground hover:text-destructive"
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>}
    </div>
  );
}

function RoadmapItem({
  id,
  text,
  itemType,
  itemIndex,
  phaseIndex,
  phaseCount,
  itemCount,
  groupId,
  onMove,
  onRemove,
  actionsOpen,
  onActionsOpenChange,
}: {
  id: string;
  text: string;
  itemType: RoadmapItemType;
  itemIndex: number;
  phaseIndex: number;
  phaseCount: number;
  itemCount: number;
  groupId: string;
  onMove: (toPhaseIndex: number, toItemIndex?: number) => void;
  onRemove: () => void;
  actionsOpen: boolean;
  onActionsOpenChange: (open: boolean) => void;
}) {
  const { ref, handleRef, isDragging } = useDraggable({
    id,
    data: { kind: "item", text, itemType, groupId },
    type: "roadmap-item",
  });
  const label = itemLabel(itemType, text, phaseIndex, itemIndex);

  return (
    <div
      ref={ref}
      data-roadmap-id={id}
      data-roadmap-item={itemType}
      className={cn(
        "flex min-w-0 items-center rounded-xl border border-transparent bg-secondary text-secondary-foreground transition-[opacity,border-color,box-shadow]",
        isDragging && "opacity-30",
      )}
    >
      <button
        ref={handleRef}
        type="button"
        aria-label={`Drag ${label}`}
        title={`Drag ${label}`}
        className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-l-xl text-muted-foreground transition-[color,background-color,box-shadow] hover:bg-background/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:cursor-grabbing"
      >
        <GripVertical aria-hidden="true" className="size-4" />
      </button>
      <span className="min-w-0 flex-1 break-words px-1 py-2 font-mono text-base font-semibold uppercase tracking-wide">
        {text || <span className="text-muted-foreground">Empty {itemType}</span>}
      </span>
      <ItemActions
        id={id}
        text={text}
        itemType={itemType}
        itemIndex={itemIndex}
        phaseIndex={phaseIndex}
        phaseCount={phaseCount}
        itemCount={itemCount}
        onMove={onMove}
        onRemove={onRemove}
        open={actionsOpen}
        onOpenChange={onActionsOpenChange}
      />
    </div>
  );
}

function ItemDropZone({ groupId, children }: { groupId: string; children: React.ReactNode }) {
  const { ref, isDropTarget } = useDroppable({ id: groupId, accept: "roadmap-item" });
  return (
    <div
      ref={ref}
      data-roadmap-drop={groupId}
      className={cn(
        "min-h-11 rounded-xl transition-[background-color,box-shadow]",
        isDropTarget && "bg-accent/10 ring-2 ring-inset ring-accent/30",
      )}
    >
      {children}
    </div>
  );
}

function PhaseItems({
  phase,
  identity,
  phaseIndex,
  phaseCount,
  onAdd,
  onMove,
  onRemove,
  openActionId,
  onOpenActionChange,
}: {
  phase: BuildPhase;
  identity: PhaseIdentity;
  phaseIndex: number;
  phaseCount: number;
  onAdd: (itemType: RoadmapItemType, value: string) => void;
  onMove: (
    itemType: RoadmapItemType,
    itemIndex: number,
    toPhaseIndex: number,
    toItemIndex?: number,
  ) => void;
  onRemove: (itemType: RoadmapItemType, itemIndex: number) => void;
  openActionId: string | null;
  onOpenActionChange: (id: string | null) => void;
}) {
  const [newGoal, setNewGoal] = React.useState("");
  const [newDeliverable, setNewDeliverable] = React.useState("");

  const renderItems = (itemType: RoadmapItemType) => {
    const values = itemType === "goal" ? phase.goals : phase.deliverables;
    const ids = identityList(identity, itemType);
    return values.map((text, itemIndex) => (
      <RoadmapItem
        key={ids[itemIndex]}
        id={ids[itemIndex]}
        text={text}
        itemType={itemType}
        itemIndex={itemIndex}
        phaseIndex={phaseIndex}
        phaseCount={phaseCount}
        itemCount={values.length}
        groupId={identity.id}
        onMove={(toPhaseIndex, toItemIndex) =>
          onMove(itemType, itemIndex, toPhaseIndex, toItemIndex)
        }
        onRemove={() => onRemove(itemType, itemIndex)}
        actionsOpen={openActionId === ids[itemIndex]}
        onActionsOpenChange={(open) => onOpenActionChange(open ? ids[itemIndex] : null)}
      />
    ));
  };

  return (
    <div className="min-w-0 space-y-4">
      <div className="space-y-2">
        <div className="text-sm font-semibold text-foreground">Goals</div>
        {phase.goals.length > 0 && <div className="space-y-2">{renderItems("goal")}</div>}
        <div className="flex min-w-0 gap-2">
          <Input
            value={newGoal}
            onChange={(event) => setNewGoal(event.target.value)}
            aria-label={`Add goal to ${phase.name || "unnamed phase"}, phase ${phaseIndex + 1}`}
            name={`roadmap-${identity.id}-goal`}
            autoComplete="off"
            placeholder="Add goal…"
            className="min-w-0"
            onKeyDown={(event) => {
              if (event.key === "Enter" && newGoal.trim()) {
                event.preventDefault();
                onAdd("goal", newGoal.trim());
                setNewGoal("");
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={!newGoal.trim()}
            aria-label={`Add Goal to phase ${phaseIndex + 1}`}
            onClick={() => {
              onAdd("goal", newGoal.trim());
              setNewGoal("");
            }}
          >
            Add Goal
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-semibold text-foreground">Deliverables</div>
        {phase.deliverables.length > 0 && (
          <div className="space-y-2">{renderItems("deliverable")}</div>
        )}
        <div className="flex min-w-0 gap-2">
          <Input
            value={newDeliverable}
            onChange={(event) => setNewDeliverable(event.target.value)}
            aria-label={`Add deliverable to ${phase.name || "unnamed phase"}, phase ${phaseIndex + 1}`}
            name={`roadmap-${identity.id}-deliverable`}
            autoComplete="off"
            placeholder="Add deliverable…"
            className="min-w-0"
            onKeyDown={(event) => {
              if (event.key === "Enter" && newDeliverable.trim()) {
                event.preventDefault();
                onAdd("deliverable", newDeliverable.trim());
                setNewDeliverable("");
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={!newDeliverable.trim()}
            aria-label={`Add Deliverable to phase ${phaseIndex + 1}`}
            onClick={() => {
              onAdd("deliverable", newDeliverable.trim());
              setNewDeliverable("");
            }}
          >
            Add Deliverable
          </Button>
        </div>
      </div>
    </div>
  );
}

function MilestoneCard({
  milestone,
  identity,
  index,
  total,
  phaseCount,
  onNameChange,
  onMoveMilestone,
  onRemoveMilestone,
  children,
}: {
  milestone: BuildPhase;
  identity: PhaseIdentity;
  index: number;
  total: number;
  phaseCount: number;
  onNameChange: (name: string) => void;
  onMoveMilestone: (to: number) => void;
  onRemoveMilestone: () => void;
  children: React.ReactNode;
}) {
  const { ref, handleRef, isDragging, isDropTarget } = useSortable({
    id: `milestone:${identity.id}`,
    index,
    group: "milestones",
    type: "milestone",
    accept: "milestone",
  });
  const name = milestone.name || `milestone ${index + 1}`;
  const positionedName = `${name}, milestone ${index + 1}`;

  return (
    <section
      ref={ref}
      data-roadmap-id={identity.id}
      data-roadmap-phase={`milestone-${index + 1}`}
      aria-labelledby={`roadmap-${identity.id}-heading`}
      className={cn(
        "min-w-0 rounded-xl border border-border/50 bg-card/30 p-4 transition-[opacity,transform,box-shadow]",
        isDragging && "scale-[0.98] opacity-40",
        isDropTarget && "ring-2 ring-accent/30",
      )}
    >
      <div data-roadmap-milestone-controls className="mb-4 flex min-w-0 flex-wrap items-center gap-2">
        <button
          ref={handleRef}
          type="button"
          aria-label={`Drag ${positionedName}`}
          title={`Drag ${positionedName}`}
          className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground transition-[color,background-color,box-shadow] hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </button>
        <h4 id={`roadmap-${identity.id}-heading`} className="shrink-0 font-mono text-sm font-semibold uppercase tracking-wider text-foreground">
          Milestone {index + 1}
        </h4>
        <Input
          value={milestone.name}
          onChange={(event) => onNameChange(event.target.value)}
          aria-label={`Milestone ${index + 1} name`}
          name={`roadmap-${identity.id}-name`}
          autoComplete="off"
          placeholder={`Milestone ${index + 1}`}
          className="min-w-40 flex-1"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Move ${positionedName} earlier`}
          title={`Move ${positionedName} earlier`}
          onClick={() => onMoveMilestone(index - 1)}
          disabled={index === 0}
          className="rounded-lg"
        >
          <ArrowUp aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Move ${positionedName} later`}
          title={`Move ${positionedName} later`}
          onClick={() => onMoveMilestone(index + 1)}
          disabled={index === total - 1}
          className="rounded-lg"
        >
          <ArrowDown aria-hidden="true" />
        </Button>
        {total > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove ${positionedName}`}
            title={`Remove ${positionedName}`}
            onClick={onRemoveMilestone}
            className="rounded-lg text-muted-foreground hover:text-destructive"
          >
            <Trash2 aria-hidden="true" />
          </Button>
        )}
      </div>
      <ItemDropZone groupId={identity.id}>{children}</ItemDropZone>
      <span className="sr-only">Phase {index + 2} of {phaseCount}</span>
    </section>
  );
}

export function RoadmapCard({ roadmap, onChange, assistant }: RoadmapCardProps) {
  const idPrefix = React.useId().replaceAll(":", "");
  const instanceRef = React.useRef<HTMLDivElement>(null);
  const [identityState, setIdentityState] = React.useState(() => ({
    roadmap,
    identities: createIdentities(roadmap, idPrefix),
  }));
  let identities = identityState.identities;
  if (identityState.roadmap !== roadmap) {
    identities = reconcileRoadmapIdentities(identityState.identities, roadmap, idPrefix);
    setIdentityState({ roadmap, identities });
  }
  const commitIdentities = (
    nextRoadmap: Roadmap,
    update: (current: RoadmapIdentities) => RoadmapIdentities,
  ) => {
    setIdentityState((current) => ({
      roadmap: nextRoadmap,
      identities: identitiesWithSnapshots(
        update(reconcileRoadmapIdentities(current.identities, roadmap, idPrefix)),
        nextRoadmap,
      ),
    }));
  };

  const [activeItem, setActiveItem] = React.useState<ActiveDrag>(null);
  const [openActionId, setOpenActionId] = React.useState<string | null>(null);
  const [recovery, setRecovery] = React.useState<RemovalRecovery | null>(null);
  const [announcement, setAnnouncement] = React.useState({ id: 0, message: "" });
  const [dragRoadmap, setDragRoadmap] = React.useState<Roadmap | null>(null);
  const visibleRecovery = recovery && (roadmap === recovery.before || roadmap === recovery.after)
    ? recovery
    : null;
  const visibleActiveItem = canCommitRoadmapDrag(dragRoadmap, roadmap) ? activeItem : null;
  const items = buildDragItems(identities);
  const itemMap = buildItemMap(roadmap, identities);
  const phaseIdentities = [identities.initial, ...identities.milestones];
  const phaseCount = phaseIdentities.length;

  const announce = (message: string) => {
    setAnnouncement((current) => ({ id: current.id + 1, message }));
  };

  const addItem = (phaseIndex: number, itemType: RoadmapItemType, value: string) => {
    const phase = phaseAt(roadmap, phaseIndex);
    const key = itemType === "goal" ? "goals" : "deliverables";
    const nextRoadmap = replacePhase(roadmap, phaseIndex, { ...phase, [key]: [...phase[key], value] });
    commitIdentities(nextRoadmap, (current) => {
      const phases = [current.initial, ...current.milestones];
      const phaseIdentity = phases[phaseIndex];
      const id = `${idPrefix}-${current.next}`;
      phases[phaseIndex] = itemType === "goal"
        ? { ...phaseIdentity, goalIds: [...phaseIdentity.goalIds, id] }
        : { ...phaseIdentity, deliverableIds: [...phaseIdentity.deliverableIds, id] };
      return { initial: phases[0], milestones: phases.slice(1), next: current.next + 1 };
    });
    onChange(nextRoadmap);
  };

  const removeItem = (phaseIndex: number, itemType: RoadmapItemType, itemIndex: number) => {
    const text = phaseAt(roadmap, phaseIndex)[itemType === "goal" ? "goals" : "deliverables"][itemIndex];
    const focusId = identityList(phaseIdentities[phaseIndex], itemType)[itemIndex];
    const beforeIdentities = identities;
    const nextRoadmap = removeRoadmapItem(roadmap, itemType, phaseIndex, itemIndex);
    commitIdentities(nextRoadmap, (current) => {
      const phases = [current.initial, ...current.milestones];
      const phaseIdentity = phases[phaseIndex];
      const key = itemType === "goal" ? "goalIds" : "deliverableIds";
      phases[phaseIndex] = {
        ...phaseIdentity,
        [key]: phaseIdentity[key].filter((_, index) => index !== itemIndex),
      };
      return { ...current, initial: phases[0], milestones: phases.slice(1) };
    });
    onChange(nextRoadmap);
    setRecovery({
      before: roadmap,
      after: nextRoadmap,
      identities: beforeIdentities,
      focusId,
      message: `Removed ${itemLabel(itemType, text, phaseIndex, itemIndex)}.`,
    });
    requestAnimationFrame(() => instanceRef.current?.querySelector<HTMLElement>("[data-roadmap-undo]")?.focus());
  };

  const moveItem = (
    phaseIndex: number,
    itemType: RoadmapItemType,
    itemIndex: number,
    toPhaseIndex: number,
    toItemIndex?: number,
  ) => {
    const sourceIds = identityList(phaseIdentities[phaseIndex], itemType);
    const text = phaseAt(roadmap, phaseIndex)[itemType === "goal" ? "goals" : "deliverables"][itemIndex];
    if (phaseIndex === toPhaseIndex) {
      const destination = toItemIndex ?? sourceIds.length - 1;
      const nextRoadmap = moveRoadmapItem(roadmap, itemType, phaseIndex, itemIndex, toPhaseIndex, destination);
      commitIdentities(nextRoadmap, (current) => {
        const phases = [current.initial, ...current.milestones];
        const phaseIdentity = phases[phaseIndex];
        const key = itemType === "goal" ? "goalIds" : "deliverableIds";
        phases[phaseIndex] = { ...phaseIdentity, [key]: arrayMove(phaseIdentity[key], itemIndex, destination) };
        return { ...current, initial: phases[0], milestones: phases.slice(1) };
      });
      onChange(nextRoadmap);
      announce(`Moved ${itemLabel(itemType, text, phaseIndex, itemIndex)} ${destination < itemIndex ? "earlier" : "later"} within phase.`);
      return;
    }
    const id = sourceIds[itemIndex];
    const targetIds = identityList(phaseIdentities[toPhaseIndex], itemType);
    const destination = Math.max(0, Math.min(toItemIndex ?? targetIds.length, targetIds.length));
    const nextRoadmap = moveRoadmapItem(roadmap, itemType, phaseIndex, itemIndex, toPhaseIndex, destination);
    commitIdentities(nextRoadmap, (current) => {
      const phases = [current.initial, ...current.milestones];
      const key = itemType === "goal" ? "goalIds" : "deliverableIds";
      const sourceIdentity = phases[phaseIndex];
      const targetIdentity = phases[toPhaseIndex];
      const nextTarget = [...targetIdentity[key]];
      nextTarget.splice(destination, 0, id);
      phases[phaseIndex] = {
        ...sourceIdentity,
        [key]: sourceIdentity[key].filter((_, index) => index !== itemIndex),
      };
      phases[toPhaseIndex] = { ...targetIdentity, [key]: nextTarget };
      return { ...current, initial: phases[0], milestones: phases.slice(1) };
    });
    onChange(nextRoadmap);
    announce(`Moved ${itemLabel(itemType, text, phaseIndex, itemIndex)} to ${toPhaseIndex === 0 ? "Initial Phase" : `Milestone ${toPhaseIndex}`}.`);
    requestAnimationFrame(() => {
      instanceRef.current?.querySelector<HTMLElement>(`[data-roadmap-action-trigger="${id}"]`)?.focus();
    });
  };

  const moveMilestone = (from: number, to: number) => {
    const nextRoadmap = moveRoadmapMilestone(roadmap, from, to);
    commitIdentities(nextRoadmap, (current) => ({
      ...current,
      milestones: arrayMove(current.milestones, from, to),
    }));
    const name = roadmap.milestones[from].name || `milestone ${from + 1}`;
    onChange(nextRoadmap);
    announce(`Moved ${name} ${to < from ? "earlier" : "later"}.`);
  };

  function onDragStart(event: DragStartEvent) {
    const source = event.operation?.source;
    if (!source) return;
    setDragRoadmap(roadmap);
    if (isSortable(source)) {
      const index = source.sortable.initialIndex;
      setActiveItem({ kind: "milestone", name: roadmap.milestones[index]?.name ?? "" });
    } else if (source.data?.kind === "item") {
      setActiveItem({ kind: "item", text: source.data.text });
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const { operation, canceled } = event;
    if (canceled || !canCommitRoadmapDrag(dragRoadmap, roadmap) || !operation?.source || !operation?.target) {
      setDragRoadmap(null);
      setActiveItem(null);
      return;
    }
    const { source, target } = operation;
    if (isSortable(source) && isSortable(target)) {
      const from = source.sortable.initialIndex;
      const to = target.sortable.index;
      if (from !== to) moveMilestone(from, to);
      setDragRoadmap(null);
      setActiveItem(null);
      return;
    }
    if (source.data?.kind === "item" && phaseIdentities.some(({ id }) => id === target.id)) {
      try {
        const nextItems = move(items, event);
        const info = itemMap.get(String(source.id));
        const moved = dragItemsToRoadmap(nextItems, roadmap, identities, itemMap);
        setIdentityState({
          roadmap: moved.roadmap,
          identities: identitiesWithSnapshots(moved.identities, moved.roadmap),
        });
        onChange(moved.roadmap);
        if (info) announce(`Moved ${info.itemType} ${info.text || "with an empty value"}.`);
      } catch {
        // The pointer target can disappear if controlled data changes during a drag.
      }
    }
    setDragRoadmap(null);
    setActiveItem(null);
  }

  return (
    <DragDropProvider onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <Card ref={instanceRef} data-roadmap-card className="min-w-0 animate-fade-up">
        <CardHeader className="pb-3">
          <h3 className="text-pretty font-display text-xl font-bold leading-tight tracking-tight">Roadmap</h3>
        </CardHeader>
        <CardContent className="min-w-0 space-y-4">
          <div data-testid="roadmap-sequence" className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
            <section
              data-roadmap-phase="initial"
              aria-labelledby={`roadmap-${identities.initial.id}-heading`}
              className="min-w-0 rounded-xl border border-border/50 bg-card/30 p-4"
            >
              <h4 id={`roadmap-${identities.initial.id}-heading`} className="micro-label mb-3 text-foreground">
                Initial Phase
              </h4>
              <Input
                value={roadmap.initialPhase.name}
                onChange={(event) => {
                  const nextRoadmap = {
                    ...roadmap,
                    initialPhase: { ...roadmap.initialPhase, name: event.target.value },
                  };
                  commitIdentities(nextRoadmap, (current) => current);
                  onChange(nextRoadmap);
                }}
                aria-label="Initial phase name"
                name="roadmap-initial-name"
                autoComplete="off"
                placeholder="Phase name"
                className="mb-4"
              />
              <ItemDropZone groupId={identities.initial.id}>
                <PhaseItems
                  key={identities.initial.id}
                  phase={roadmap.initialPhase}
                  identity={identities.initial}
                  phaseIndex={0}
                  phaseCount={phaseCount}
                  onAdd={(itemType, value) => addItem(0, itemType, value)}
                  onMove={(itemType, itemIndex, toPhaseIndex, toItemIndex) =>
                    moveItem(0, itemType, itemIndex, toPhaseIndex, toItemIndex)
                  }
                  onRemove={(itemType, itemIndex) => removeItem(0, itemType, itemIndex)}
                  openActionId={openActionId}
                  onOpenActionChange={setOpenActionId}
                />
              </ItemDropZone>
            </section>

            {roadmap.milestones.map((milestone, index) => {
              const identity = identities.milestones[index];
              return (
                <MilestoneCard
                  key={identity.id}
                  milestone={milestone}
                  identity={identity}
                  index={index}
                  total={roadmap.milestones.length}
                  phaseCount={phaseCount}
                  onNameChange={(name) => {
                    const milestones = [...roadmap.milestones];
                    milestones[index] = { ...milestone, name };
                    const nextRoadmap = { ...roadmap, milestones };
                    commitIdentities(nextRoadmap, (current) => current);
                    onChange(nextRoadmap);
                  }}
                  onMoveMilestone={(to) => moveMilestone(index, to)}
                  onRemoveMilestone={() => {
                    const nextRoadmap = {
                      ...roadmap,
                      milestones: roadmap.milestones.filter((_, milestoneIndex) => milestoneIndex !== index),
                    };
                    const beforeIdentities = identities;
                    commitIdentities(nextRoadmap, (current) => ({
                      ...current,
                      milestones: current.milestones.filter((_, milestoneIndex) => milestoneIndex !== index),
                    }));
                    onChange(nextRoadmap);
                    setRecovery({
                      before: roadmap,
                      after: nextRoadmap,
                      identities: beforeIdentities,
                      focusId: identity.id,
                      message: `Removed ${milestone.name || `milestone ${index + 1}`}, milestone ${index + 1}.`,
                    });
                    requestAnimationFrame(() => instanceRef.current?.querySelector<HTMLElement>("[data-roadmap-undo]")?.focus());
                  }}
                >
                  <PhaseItems
                    phase={milestone}
                    identity={identity}
                    phaseIndex={index + 1}
                    phaseCount={phaseCount}
                    onAdd={(itemType, value) => addItem(index + 1, itemType, value)}
                    onMove={(itemType, itemIndex, toPhaseIndex, toItemIndex) =>
                      moveItem(index + 1, itemType, itemIndex, toPhaseIndex, toItemIndex)
                    }
                    onRemove={(itemType, itemIndex) => removeItem(index + 1, itemType, itemIndex)}
                    openActionId={openActionId}
                    onOpenActionChange={setOpenActionId}
                  />
                </MilestoneCard>
              );
            })}

            <div data-roadmap-add className="flex min-h-24 min-w-0 items-center justify-center rounded-xl border border-dashed border-border/70 p-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const newMilestone = { name: "", goals: [], deliverables: [] };
                  const nextRoadmap = {
                    ...roadmap,
                    milestones: [...roadmap.milestones, newMilestone],
                  };
                  commitIdentities(nextRoadmap, (current) => ({
                    ...current,
                    milestones: [
                      ...current.milestones,
                      {
                        id: `${idPrefix}-${current.next}`,
                        goalIds: [],
                        deliverableIds: [],
                        snapshot: copyPhase(newMilestone),
                      },
                    ],
                    next: current.next + 1,
                  }));
                  onChange(nextRoadmap);
                }}
                className="w-full"
              >
                <Plus aria-hidden="true" />
                Add Milestone
              </Button>
            </div>
          </div>

          <div
            data-testid="roadmap-announcement"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className={cn(
              "text-sm text-muted-foreground",
              !visibleRecovery && "sr-only",
            )}
          >
            {visibleRecovery ? (
              <span className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 px-3">
                <span>{visibleRecovery.message}</span>
                <Button
                  data-roadmap-undo
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const restored = visibleRecovery;
                    setIdentityState({ roadmap: restored.before, identities: restored.identities });
                    onChange(restored.before);
                    setRecovery(null);
                    announce("Removal undone.");
                    requestAnimationFrame(() => {
                      const actionTrigger = instanceRef.current?.querySelector<HTMLElement>(
                        `[data-roadmap-action-trigger="${restored.focusId}"]`,
                      );
                      const dragTrigger = instanceRef.current?.querySelector<HTMLElement>(
                        `[data-roadmap-id="${restored.focusId}"] button`,
                      );
                      (actionTrigger ?? dragTrigger)?.focus();
                    });
                  }}
                >
                  Undo
                </Button>
              </span>
            ) : (
              <span key={announcement.id}>{announcement.message}</span>
            )}
          </div>
          {assistant && <div className="min-w-0">{assistant}</div>}
        </CardContent>
      </Card>

      <DragOverlay dropAnimation={null}>
        {visibleActiveItem?.kind === "item" && (
          <Badge variant="secondary" className="text-base opacity-80 shadow-lg">
            {visibleActiveItem.text || "Empty item"}
          </Badge>
        )}
        {visibleActiveItem?.kind === "milestone" && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm font-medium opacity-80 shadow-lg">
            <GripVertical aria-hidden="true" className="size-4 text-muted-foreground" />
            {visibleActiveItem.name || "New Milestone"}
          </div>
        )}
      </DragOverlay>
    </DragDropProvider>
  );
}
