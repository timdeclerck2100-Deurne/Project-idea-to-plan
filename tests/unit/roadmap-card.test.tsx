import { useState, type ReactNode } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Roadmap } from "@/lib/brief-schema";

const dndMock = vi.hoisted(() => ({ providerProps: null as Record<string, unknown> | null }));

vi.mock("@dnd-kit/react", () => ({
  DragDropProvider: ({ children, ...props }: { children: ReactNode } & Record<string, unknown>) => {
    dndMock.providerProps = props;
    return children;
  },
  DragOverlay: ({ children }: { children: ReactNode }) => children,
  useDraggable: () => ({ ref: vi.fn(), handleRef: vi.fn(), isDragging: false }),
  useDroppable: () => ({ ref: vi.fn(), isDropTarget: false }),
}));

vi.mock("@dnd-kit/react/sortable", () => ({
  isSortable: (value: { sortable?: unknown }) => Boolean(value?.sortable),
  useSortable: () => ({
    ref: vi.fn(),
    handleRef: vi.fn(),
    isDragging: false,
    isDropTarget: false,
  }),
}));

import {
  RoadmapCard,
  canCommitRoadmapDrag,
  moveRoadmapItem,
  moveRoadmapMilestone,
  removeRoadmapItem,
} from "@/components/planner/roadmap-card";

const roadmap: Roadmap = {
  initialPhase: {
    name: "Research foundation",
    goals: ["Validate researcher workflows", "Confirm access requirements"],
    deliverables: ["Interview synthesis", "Clickable capture prototype"],
  },
  milestones: [
    {
      name: "Team workspace",
      goals: ["Support collaborative synthesis", "Centralize field evidence"],
      deliverables: ["Shared project dashboard", "Observation tagging"],
    },
    {
      name: "Insight automation",
      goals: ["Surface recurring themes"],
      deliverables: ["AI-assisted theme suggestions", "Evidence links"],
    },
    {
      name: "Research operations",
      goals: ["Standardize project reporting"],
      deliverables: ["Exportable research brief"],
    },
  ],
};

function ControlledRoadmap({ initial = roadmap, onChange = vi.fn() }: { initial?: Roadmap; onChange?: (value: Roadmap) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <RoadmapCard
        roadmap={value}
        onChange={(next) => {
          onChange(next);
          setValue(next);
        }}
      />
      <div data-testid="roadmap-value">{JSON.stringify(value)}</div>
    </>
  );
}

function currentRoadmap() {
  return JSON.parse(screen.getByTestId("roadmap-value").textContent ?? "") as Roadmap;
}

describe("roadmap value operations", () => {
  it("guards drag completion with the exact controlled snapshot captured at start", () => {
    expect(canCommitRoadmapDrag(roadmap, roadmap)).toBe(true);
    expect(canCommitRoadmapDrag(roadmap, { ...roadmap })).toBe(false);
    expect(canCommitRoadmapDrag(null, roadmap)).toBe(false);
  });

  it("moves milestones without changing any nested phase arrays", () => {
    expect(moveRoadmapMilestone(roadmap, 2, 0)).toEqual({
      initialPhase: roadmap.initialPhase,
      milestones: [roadmap.milestones[2], roadmap.milestones[0], roadmap.milestones[1]],
    });
    expect(moveRoadmapMilestone(roadmap, 0, 99)).toBe(roadmap);
  });

  it("moves goals earlier and later within one phase without touching deliverables", () => {
    const later = moveRoadmapItem(roadmap, "goal", 0, 0, 0, 1);
    expect(later.initialPhase).toEqual({
      ...roadmap.initialPhase,
      goals: ["Confirm access requirements", "Validate researcher workflows"],
    });
    expect(moveRoadmapItem(later, "goal", 0, 1, 0, 0)).toEqual(roadmap);
  });

  it("moves exact goal and deliverable values across all phase boundaries", () => {
    const movedGoal = moveRoadmapItem(roadmap, "goal", 0, 1, 2);
    expect(movedGoal.initialPhase.goals).toEqual(["Validate researcher workflows"]);
    expect(movedGoal.milestones[1].goals).toEqual([
      "Surface recurring themes",
      "Confirm access requirements",
    ]);
    expect(movedGoal.initialPhase.deliverables).toEqual(roadmap.initialPhase.deliverables);

    const movedDeliverable = moveRoadmapItem(roadmap, "deliverable", 2, 0, 0, 1);
    expect(movedDeliverable.milestones[1].deliverables).toEqual(["Evidence links"]);
    expect(movedDeliverable.initialPhase.deliverables).toEqual([
      "Interview synthesis",
      "AI-assisted theme suggestions",
      "Clickable capture prototype",
    ]);
    expect(movedDeliverable.milestones.map(({ goals }) => goals)).toEqual(
      roadmap.milestones.map(({ goals }) => goals),
    );
  });

  it("clamps cross-phase drops and preserves the selected duplicate occurrence", () => {
    const values: Roadmap = {
      initialPhase: { name: "Start", goals: ["same", "keep", "same"], deliverables: [] },
      milestones: [{ name: "Next", goals: ["target"], deliverables: [] }],
    };

    const appended = moveRoadmapItem(values, "goal", 0, 2, 1, 99);
    expect(appended.initialPhase.goals).toEqual(["same", "keep"]);
    expect(appended.milestones[0].goals).toEqual(["target", "same"]);

    const prepended = moveRoadmapItem(values, "goal", 0, 0, 1, -10);
    expect(prepended.initialPhase.goals).toEqual(["keep", "same"]);
    expect(prepended.milestones[0].goals).toEqual(["same", "target"]);
    expect(moveRoadmapItem(values, "goal", 0, 99, 1)).toBe(values);
  });

  it("removes only the selected duplicate or empty value", () => {
    const values: Roadmap = {
      initialPhase: { name: "", goals: ["same", "", "same"], deliverables: ["", "keep"] },
      milestones: [],
    };
    expect(removeRoadmapItem(values, "goal", 0, 1).initialPhase.goals).toEqual(["same", "same"]);
    expect(removeRoadmapItem(values, "deliverable", 0, 0).initialPhase.deliverables).toEqual(["keep"]);
  });
});

describe("RoadmapCard", () => {
  it("renders one sequential DOM sequence through Add Milestone", () => {
    render(<RoadmapCard roadmap={roadmap} onChange={vi.fn()} />);
    const sequence = screen.getByTestId("roadmap-sequence");
    expect(Array.from(sequence.children).map((element) =>
      element.getAttribute("data-roadmap-phase") ?? element.getAttribute("data-roadmap-add"),
    )).toEqual(["initial", "milestone-1", "milestone-2", "milestone-3", "true"]);
    expect(sequence).toHaveClass("grid-cols-1", "lg:grid-cols-2");
  });

  it("preserves exact values through name edits, additions, and milestone removal", async () => {
    const user = userEvent.setup();
    render(<ControlledRoadmap />);

    const initialName = screen.getByRole("textbox", { name: "Initial phase name" });
    await user.clear(initialName);
    await user.type(initialName, "Validated foundation");
    const initialGoal = screen.getByRole("textbox", { name: "Add goal to Validated foundation, phase 1" });
    await user.type(initialGoal, "New exact goal{Enter}");
    await user.click(screen.getByRole("button", { name: "Add Milestone" }));
    await user.click(screen.getByRole("button", { name: "Remove Insight automation, milestone 2" }));

    expect(currentRoadmap()).toEqual({
      initialPhase: {
        ...roadmap.initialPhase,
        name: "Validated foundation",
        goals: [...roadmap.initialPhase.goals, "New exact goal"],
      },
      milestones: [
        roadmap.milestones[0],
        roadmap.milestones[2],
        { name: "", goals: [], deliverables: [] },
      ],
    });
  });

  it("provides button equivalents for milestone and within-phase item movement", async () => {
    const user = userEvent.setup();
    render(<ControlledRoadmap />);

    await user.click(screen.getByRole("button", { name: "Move Insight automation, milestone 2 earlier" }));
    expect(currentRoadmap().milestones).toEqual([
      roadmap.milestones[1],
      roadmap.milestones[0],
      roadmap.milestones[2],
    ]);
    await user.click(screen.getByRole("button", { name: "Move Insight automation, milestone 1 later" }));
    expect(currentRoadmap().milestones).toEqual(roadmap.milestones);

    await user.click(screen.getByLabelText("Actions for goal Validate researcher workflows, phase 1, item 1"));
    await user.click(screen.getByRole("button", { name: "Move goal Validate researcher workflows, phase 1, item 1 later within phase" }));
    expect(currentRoadmap().initialPhase.goals).toEqual([
      "Confirm access requirements",
      "Validate researcher workflows",
    ]);
    await user.click(screen.getByLabelText(
      "Actions for goal Validate researcher workflows, phase 1, item 2",
    ));
    const moveEarlier = screen.getByRole("button", {
      name: "Move goal Validate researcher workflows, phase 1, item 2 earlier within phase",
    });
    await user.click(moveEarlier);
    expect(currentRoadmap().initialPhase.goals).toEqual(roadmap.initialPhase.goals);
    const restoredTrigger = screen.getByLabelText(
      "Actions for goal Validate researcher workflows, phase 1, item 1",
    );
    expect(restoredTrigger).toHaveAttribute("aria-expanded", "false");
    await waitFor(() => expect(document.activeElement).toBe(restoredTrigger));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Moved goal Validate researcher workflows, phase 1, item 2 earlier within phase.",
    );
  });

  it("moves goals and deliverables to adjacent phases and announces removals", async () => {
    const user = userEvent.setup();
    render(<ControlledRoadmap />);

    await user.click(screen.getByLabelText("Actions for goal Confirm access requirements, phase 1, item 2"));
    await user.click(screen.getByRole("button", { name: "Move goal Confirm access requirements, phase 1, item 2 to next phase" }));
    expect(currentRoadmap().initialPhase.goals).toEqual(["Validate researcher workflows"]);
    expect(currentRoadmap().milestones[0].goals).toEqual([
      ...roadmap.milestones[0].goals,
      "Confirm access requirements",
    ]);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Moved goal Confirm access requirements, phase 1, item 2 to Milestone 1.",
    );

    await user.click(screen.getByLabelText("Actions for deliverable Shared project dashboard, phase 2, item 1"));
    await user.click(screen.getByRole("button", { name: "Move deliverable Shared project dashboard, phase 2, item 1 to previous phase" }));
    expect(currentRoadmap().initialPhase.deliverables).toEqual([
      ...roadmap.initialPhase.deliverables,
      "Shared project dashboard",
    ]);
    expect(currentRoadmap().milestones[0].deliverables).toEqual(["Observation tagging"]);

    await user.click(screen.getByLabelText("Actions for deliverable Observation tagging, phase 2, item 1"));
    await user.click(screen.getByRole("button", { name: "Remove deliverable Observation tagging, phase 2, item 1" }));
    expect(currentRoadmap().milestones[0].deliverables).toEqual([]);
    expect(screen.getByRole("status")).toHaveTextContent("Removed deliverable Observation tagging, phase 2, item 1.");
  });

  it("returns focus to the moved item's destination action trigger", async () => {
    const user = userEvent.setup();
    render(<ControlledRoadmap />);

    await user.click(screen.getByLabelText("Actions for goal Confirm access requirements, phase 1, item 2"));
    await user.click(screen.getByRole("button", {
      name: "Move goal Confirm access requirements, phase 1, item 2 to next phase",
    }));

    const destination = screen.getByLabelText(
      "Actions for goal Confirm access requirements, phase 2, item 3",
    );
    await waitFor(() => expect(document.activeElement).toBe(destination));
    expect(destination).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps local drafts with stable transient identities across duplicate milestone reorder", async () => {
    const duplicateRoadmap: Roadmap = {
      initialPhase: { name: "", goals: ["same", "same"], deliverables: [] },
      milestones: [
        { name: "", goals: ["duplicate"], deliverables: ["first marker"] },
        { name: "", goals: ["duplicate"], deliverables: ["second marker"] },
      ],
    };
    const user = userEvent.setup();
    render(<ControlledRoadmap initial={duplicateRoadmap} />);

    const secondCard = screen.getByText("second marker").closest("section");
    expect(secondCard).not.toBeNull();
    const secondDraft = within(secondCard!).getByRole("textbox", { name: "Add goal to unnamed phase, phase 3" });
    fireEvent.change(secondDraft, { target: { value: "draft follows identity" } });
    await user.click(screen.getByRole("button", { name: "Move milestone 2, milestone 2 earlier" }));

    const movedCard = screen.getByText("second marker").closest("section");
    expect(within(movedCard!).getByRole("textbox", { name: "Add goal to unnamed phase, phase 2" })).toHaveValue(
      "draft follows identity",
    );
    expect(screen.getAllByText("duplicate")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Move milestone 1, milestone 1 later" })).toBeEnabled();
  });

  it("supports empty names and values without key collisions or inaccessible controls", async () => {
    const values: Roadmap = {
      initialPhase: { name: "", goals: ["", ""], deliverables: [""] },
      milestones: [
        { name: "", goals: [], deliverables: [] },
        { name: "", goals: [], deliverables: [] },
      ],
    };
    const user = userEvent.setup();
    render(<ControlledRoadmap initial={values} />);

    expect(screen.getByRole("button", { name: "Drag milestone 1, milestone 1" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Move milestone 2, milestone 2 earlier" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Drag goal with an empty value, phase 1, item 1" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Drag goal with an empty value, phase 1, item 2" })).toBeEnabled();
    await user.click(screen.getByLabelText("Actions for goal with an empty value, phase 1, item 2"));
    await user.click(screen.getByRole("button", { name: "Remove goal with an empty value, phase 1, item 2" }));
    expect(currentRoadmap().initialPhase.goals).toEqual([""]);
    expect(currentRoadmap().initialPhase.deliverables).toEqual([""]);
    expect(screen.getByRole("status")).toHaveTextContent("Removed goal with an empty value, phase 1, item 2.");
  });

  it("undoes an item removal with its exact ID and returns focus to its action trigger", async () => {
    const user = userEvent.setup();
    render(<ControlledRoadmap />);
    const action = screen.getByLabelText(
      "Actions for goal Confirm access requirements, phase 1, item 2",
    );
    const item = action.closest<HTMLElement>("[data-roadmap-id]")!;
    const id = item.dataset.roadmapId;

    await user.click(action);
    await user.click(screen.getByRole("button", {
      name: "Remove goal Confirm access requirements, phase 1, item 2",
    }));
    expect(screen.getByRole("status")).toBeVisible();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Undo" })));
    await user.click(screen.getByRole("button", { name: "Undo" }));

    expect(currentRoadmap()).toEqual(roadmap);
    const restored = screen.getByLabelText(
      "Actions for goal Confirm access requirements, phase 1, item 2",
    );
    expect(restored.closest<HTMLElement>("[data-roadmap-id]")?.dataset.roadmapId).toBe(id);
    await waitFor(() => expect(document.activeElement).toBe(restored));
  });

  it("undoes a whole milestone removal with exact values, order, IDs, and focus", async () => {
    const user = userEvent.setup();
    render(<ControlledRoadmap />);
    const remove = screen.getByRole("button", {
      name: "Remove Insight automation, milestone 2",
    });
    const id = remove.closest<HTMLElement>("[data-roadmap-id]")?.dataset.roadmapId;
    await user.click(remove);
    expect(currentRoadmap().milestones).toEqual([roadmap.milestones[0], roadmap.milestones[2]]);
    const undo = screen.getByRole("button", { name: "Undo" });
    await waitFor(() => expect(document.activeElement).toBe(undo));
    await user.click(undo);

    expect(currentRoadmap()).toEqual(roadmap);
    const restored = screen.getByRole("button", {
      name: "Drag Insight automation, milestone 2",
    });
    expect(restored.closest<HTMLElement>("[data-roadmap-id]")?.dataset.roadmapId).toBe(id);
    await waitFor(() => expect(document.activeElement).toBe(restored));
  });

  it("reconciles external milestone reorder and middle insertion/removal by structure", () => {
    const { rerender } = render(<RoadmapCard roadmap={roadmap} onChange={vi.fn()} />);
    const ids = new Map(
      roadmap.milestones.map((phase) => [
        phase.name,
        screen.getByDisplayValue(phase.name).closest<HTMLElement>("[data-roadmap-id]")?.dataset.roadmapId,
      ]),
    );
    const inserted = { name: "Inserted", goals: ["new"], deliverables: ["new output"] };
    const reordered: Roadmap = {
      initialPhase: roadmap.initialPhase,
      milestones: [roadmap.milestones[2], inserted, roadmap.milestones[0], roadmap.milestones[1]],
    };
    rerender(<RoadmapCard roadmap={reordered} onChange={vi.fn()} />);
    roadmap.milestones.forEach((phase) => {
      expect(screen.getByDisplayValue(phase.name).closest<HTMLElement>("[data-roadmap-id]")?.dataset.roadmapId)
        .toBe(ids.get(phase.name));
    });
    const insertedId = screen.getByDisplayValue("Inserted").closest<HTMLElement>("[data-roadmap-id]")?.dataset.roadmapId;
    expect([...ids.values()]).not.toContain(insertedId);

    const removedAgain = { ...reordered, milestones: reordered.milestones.filter((phase) => phase !== inserted) };
    rerender(<RoadmapCard roadmap={removedAgain} onChange={vi.fn()} />);
    roadmap.milestones.forEach((phase) => {
      expect(screen.getByDisplayValue(phase.name).closest<HTMLElement>("[data-roadmap-id]")?.dataset.roadmapId)
        .toBe(ids.get(phase.name));
    });
  });

  it("preserves duplicate item IDs by value occurrence across external insertion and reorder", () => {
    const values: Roadmap = {
      initialPhase: { name: "Duplicates", goals: ["same", "middle", "same"], deliverables: [] },
      milestones: [],
    };
    const { rerender, container } = render(<RoadmapCard roadmap={values} onChange={vi.fn()} />);
    const before = Array.from(container.querySelectorAll<HTMLElement>('[data-roadmap-item="goal"]'))
      .map((element) => element.dataset.roadmapId);
    const changed: Roadmap = {
      ...values,
      initialPhase: { ...values.initialPhase, goals: ["new", "same", "same", "middle"] },
    };
    rerender(<RoadmapCard roadmap={changed} onChange={vi.fn()} />);
    const after = Array.from(container.querySelectorAll<HTMLElement>('[data-roadmap-item="goal"]'))
      .map((element) => element.dataset.roadmapId);
    expect(after.slice(1)).toEqual([before[0], before[2], before[1]]);
    expect(before).not.toContain(after[0]);
  });

  it("does not carry milestone IDs, drafts, or focus into complete same-length replacement", () => {
    const { rerender } = render(<RoadmapCard roadmap={roadmap} onChange={vi.fn()} />);
    const oldCard = screen.getByDisplayValue("Team workspace").closest<HTMLElement>("[data-roadmap-id]")!;
    const oldId = oldCard.dataset.roadmapId;
    const draft = within(oldCard).getByRole("textbox", {
      name: "Add goal to Team workspace, phase 2",
    });
    fireEvent.change(draft, { target: { value: "do not inherit" } });
    draft.focus();
    const replacement: Roadmap = {
      initialPhase: { name: "Replacement start", goals: ["alpha"], deliverables: ["beta"] },
      milestones: roadmap.milestones.map((_, index) => ({
        name: `Replacement ${index + 1}`,
        goals: [`goal ${index + 1}`],
        deliverables: [`output ${index + 1}`],
      })),
    };
    rerender(<RoadmapCard roadmap={replacement} onChange={vi.fn()} />);
    const newCard = screen.getByDisplayValue("Replacement 1").closest<HTMLElement>("[data-roadmap-id]")!;
    expect(newCard.dataset.roadmapId).not.toBe(oldId);
    expect(within(newCard).getByRole("textbox", {
      name: "Add goal to Replacement 1, phase 2",
    })).toHaveValue("");
    expect(newCard.contains(document.activeElement)).toBe(false);
  });

  it("preserves identity, draft, and focus for a corresponding same-name update", () => {
    const { rerender } = render(<RoadmapCard roadmap={roadmap} onChange={vi.fn()} />);
    const oldCard = screen.getByDisplayValue("Team workspace").closest<HTMLElement>("[data-roadmap-id]")!;
    const oldId = oldCard.dataset.roadmapId;
    const draft = within(oldCard).getByRole("textbox", {
      name: "Add goal to Team workspace, phase 2",
    });
    fireEvent.change(draft, { target: { value: "keep this draft" } });
    draft.focus();

    const updated: Roadmap = {
      ...roadmap,
      milestones: [
        { ...roadmap.milestones[0], goals: [...roadmap.milestones[0].goals, "New related goal"] },
        ...roadmap.milestones.slice(1),
      ],
    };
    rerender(<RoadmapCard roadmap={updated} onChange={vi.fn()} />);

    const updatedCard = screen.getByDisplayValue("Team workspace").closest<HTMLElement>("[data-roadmap-id]")!;
    const updatedDraft = within(updatedCard).getByRole("textbox", {
      name: "Add goal to Team workspace, phase 2",
    });
    expect(updatedCard.dataset.roadmapId).toBe(oldId);
    expect(updatedDraft).toHaveValue("keep this draft");
    expect(document.activeElement).toBe(updatedDraft);
  });

  it("does not swap identities or drafts when reordered edits share a generic item", () => {
    const values: Roadmap = {
      initialPhase: { name: "Start", goals: [], deliverables: [] },
      milestones: [
        { name: "Alpha", goals: ["Shared", "Alpha old"], deliverables: ["Alpha output"] },
        { name: "Beta", goals: ["Shared", "Beta old"], deliverables: ["Beta output"] },
      ],
    };
    const { rerender } = render(<RoadmapCard roadmap={values} onChange={vi.fn()} />);
    const alpha = screen.getByDisplayValue("Alpha").closest<HTMLElement>("[data-roadmap-id]")!;
    const beta = screen.getByDisplayValue("Beta").closest<HTMLElement>("[data-roadmap-id]")!;
    const alphaId = alpha.dataset.roadmapId;
    const betaId = beta.dataset.roadmapId;
    fireEvent.change(within(alpha).getByRole("textbox", { name: "Add goal to Alpha, phase 2" }), {
      target: { value: "alpha draft" },
    });
    fireEvent.change(within(beta).getByRole("textbox", { name: "Add goal to Beta, phase 3" }), {
      target: { value: "beta draft" },
    });

    const changed: Roadmap = {
      initialPhase: values.initialPhase,
      milestones: [
        { name: "Beta", goals: ["Shared", "Beta revised"], deliverables: ["Beta launch"] },
        { name: "Alpha", goals: ["Shared", "Alpha revised"], deliverables: ["Alpha launch"] },
      ],
    };
    rerender(<RoadmapCard roadmap={changed} onChange={vi.fn()} />);

    const movedBeta = screen.getByDisplayValue("Beta").closest<HTMLElement>("[data-roadmap-id]")!;
    const movedAlpha = screen.getByDisplayValue("Alpha").closest<HTMLElement>("[data-roadmap-id]")!;
    expect(movedBeta.dataset.roadmapId).toBe(betaId);
    expect(within(movedBeta).getByRole("textbox", { name: "Add goal to Beta, phase 2" })).toHaveValue("beta draft");
    expect(movedAlpha.dataset.roadmapId).toBe(alphaId);
    expect(within(movedAlpha).getByRole("textbox", { name: "Add goal to Alpha, phase 3" })).toHaveValue("alpha draft");
  });

  it("resets identity, draft, and focus for an unrelated same-name replacement", () => {
    const { rerender } = render(<RoadmapCard roadmap={roadmap} onChange={vi.fn()} />);
    const oldCard = screen.getByDisplayValue("Team workspace").closest<HTMLElement>("[data-roadmap-id]")!;
    const oldId = oldCard.dataset.roadmapId;
    const draft = within(oldCard).getByRole("textbox", {
      name: "Add goal to Team workspace, phase 2",
    });
    fireEvent.change(draft, { target: { value: "do not inherit" } });
    draft.focus();

    const replacement: Roadmap = {
      ...roadmap,
      milestones: [
        { name: "Team workspace", goals: ["Unrelated goal"], deliverables: ["Unrelated output"] },
        ...roadmap.milestones.slice(1),
      ],
    };
    rerender(<RoadmapCard roadmap={replacement} onChange={vi.fn()} />);

    const newCard = screen.getByDisplayValue("Team workspace").closest<HTMLElement>("[data-roadmap-id]")!;
    expect(newCard.dataset.roadmapId).not.toBe(oldId);
    expect(within(newCard).getByRole("textbox", {
      name: "Add goal to Team workspace, phase 2",
    })).toHaveValue("");
    expect(newCard.contains(document.activeElement)).toBe(false);
  });

  it("gives duplicate values unique control names and keeps only one controlled action toolbar open", async () => {
    const user = userEvent.setup();
    const values: Roadmap = {
      initialPhase: { name: "Same", goals: ["duplicate", "duplicate"], deliverables: [] },
      milestones: [
        { name: "Same", goals: ["duplicate"], deliverables: [] },
        { name: "Same", goals: ["duplicate"], deliverables: [] },
      ],
    };
    const { container } = render(<ControlledRoadmap initial={values} />);
    const labels = Array.from(container.querySelectorAll<HTMLElement>("button[aria-label], summary[aria-label], input[aria-label]"))
      .map((element) => element.getAttribute("aria-label"));
    expect(new Set(labels).size).toBe(labels.length);

    const first = screen.getByLabelText("Actions for goal duplicate, phase 1, item 1");
    const second = screen.getByLabelText("Actions for goal duplicate, phase 1, item 2");
    await user.click(first);
    await user.click(second);
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(second).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    expect(second).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(second);
  });

  it("focuses removal Undo within the RoadmapCard instance that performed the removal", async () => {
    const user = userEvent.setup();
    render(
      <>
        <div data-testid="first-roadmap"><ControlledRoadmap /></div>
        <div data-testid="second-roadmap"><ControlledRoadmap /></div>
      </>,
    );
    const first = within(screen.getByTestId("first-roadmap"));
    const second = within(screen.getByTestId("second-roadmap"));

    await user.click(first.getByLabelText("Actions for goal Confirm access requirements, phase 1, item 2"));
    await user.click(first.getByRole("button", { name: "Remove goal Confirm access requirements, phase 1, item 2" }));
    await waitFor(() => expect(document.activeElement).toBe(first.getByRole("button", { name: "Undo" })));
    await user.click(second.getByLabelText("Actions for goal Confirm access requirements, phase 1, item 2"));
    await user.click(second.getByRole("button", { name: "Remove goal Confirm access requirements, phase 1, item 2" }));

    await waitFor(() => expect(document.activeElement).toBe(second.getByRole("button", { name: "Undo" })));
  });

  it("ignores provider drag end and cancel events after the controlled roadmap changes", () => {
    const onChange = vi.fn();
    const { rerender } = render(<RoadmapCard roadmap={roadmap} onChange={onChange} />);
    const provider = dndMock.providerProps as {
      onDragStart: (event: unknown) => void;
      onDragEnd: (event: unknown) => void;
    };
    const source = { id: "old-id", data: { kind: "item", text: "old" } };
    act(() => provider.onDragStart({ operation: { source } }));
    const external = { ...roadmap, initialPhase: { ...roadmap.initialPhase, goals: ["replacement"] } };
    rerender(<RoadmapCard roadmap={external} onChange={onChange} />);
    const updatedProvider = dndMock.providerProps as typeof provider;
    act(() => updatedProvider.onDragEnd({ operation: { source, target: { id: "target" } }, canceled: false }));
    expect(onChange).not.toHaveBeenCalled();

    act(() => provider.onDragStart({ operation: { source } }));
    act(() => provider.onDragEnd({ operation: { source, target: { id: "target" } }, canceled: true }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("transforms milestone order through deterministic provider drag start and end events", () => {
    const onChange = vi.fn();
    render(<RoadmapCard roadmap={roadmap} onChange={onChange} />);
    let provider = dndMock.providerProps as {
      onDragStart: (event: unknown) => void;
      onDragEnd: (event: unknown) => void;
    };
    const source = { id: "milestone-source", sortable: { initialIndex: 2 } };
    const target = { id: "milestone-target", sortable: { index: 0 } };
    act(() => provider.onDragStart({ operation: { source } }));
    expect(screen.getByText("Research operations")).toBeVisible();
    provider = dndMock.providerProps as typeof provider;
    act(() => provider.onDragEnd({ operation: { source, target }, canceled: false }));
    expect(onChange).toHaveBeenCalledWith(moveRoadmapMilestone(roadmap, 2, 0));
  });
});
