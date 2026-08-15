import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  buildDataModelGraph,
  DataModelFlow,
  DataModelOutline,
} from "@/components/planner/data-model-flow";
import { ExpandableGraphCard } from "@/components/planner/expandable-graph-card";
import { BriefWorkspace } from "@/components/planner/brief-workspace";
import {
  buildProcessGraph,
  PlannerProcessOutline,
} from "@/components/planner/planner-process-flow";
import type { ProjectBrief } from "@/lib/brief-schema";
import { completeProjectBrief } from "@/tests/fixtures/project-brief";

vi.hoisted(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
});

const relationshipDataModel = {
  entities: [
    { name: " User ", description: "A user with a deliberately long description that wraps over several rendered lines.", fields: [{ name: "id", type: "uuid" }] },
    { name: "Team", description: "A team", fields: [] },
    { name: "Item", description: "First item", fields: [] },
    { name: " Item ", description: "Second item", fields: [] },
    { name: "", description: "Empty-name entity", fields: [{ name: "value", type: "text" }] },
  ],
  relationships: [
    { source: "User", target: " Team ", label: "joins", type: "many-to-one" },
    { source: "Item", target: "Team", label: "owns", type: "one-to-many" },
    { source: "Missing", target: "Team", label: "invalid", type: "one-to-one" },
    { source: "", target: "Team", label: "empty", type: "one-to-one" },
  ],
} satisfies ProjectBrief["dataModel"];

describe("planner graphs", () => {
  it("normalizes names and only draws relationships with two unique endpoints", () => {
    const first = buildDataModelGraph(relationshipDataModel);
    const second = buildDataModelGraph(relationshipDataModel);

    expect(first.nodes.map(({ id }) => id)).toEqual([
      "data-entity-0",
      "data-entity-1",
      "data-entity-2",
      "data-entity-3",
      "data-entity-4",
    ]);
    expect(second.nodes.map(({ id }) => id)).toEqual(first.nodes.map(({ id }) => id));
    expect(first.edges).toHaveLength(1);
    expect(first.edges[0]).toMatchObject({
      source: "data-entity-0",
      target: "data-entity-1",
      markerEnd: { type: "arrowclosed" },
    });
    expect(first.relationships.map(({ status }) => status)).toEqual([
      "shown",
      "ambiguous",
      "missing",
      "missing",
    ]);
    expect(first.relationships[1].reason).toContain("matches 2 entities");
    expect(first.relationships[2].reason).toContain("has no uniquely named entity");
    expect(first.relationships[3].reason).toContain("empty name");
  });

  it("uses estimated content heights to prevent rows from overlapping", () => {
    const graph = buildDataModelGraph(relationshipDataModel, true);
    for (let index = 1; index < graph.nodes.length; index += 1) {
      expect(graph.nodes[index].position.y - graph.nodes[index - 1].position.y).toBeGreaterThanOrEqual(192);
    }
    expect(graph.bounds.height).toBeGreaterThan(900);
  });

  it("exposes every entity and classified relationship in an open synchronized outline", () => {
    const { container } = render(<DataModelOutline dataModel={relationshipDataModel} />);
    const details = container.querySelector("details");

    expect(details).toHaveAttribute("open");
    expect(screen.getByText("Unnamed entity 5")).toBeInTheDocument();
    expect(screen.getByText("value: text")).toBeInTheDocument();
    expect(screen.getByText(/Data model outline/)).toHaveTextContent("1 of 4 relationships shown");
    expect(screen.getByText(/ambiguous/i).closest("li")).toHaveTextContent("Item to Team: owns");
    expect(screen.getAllByText("Missing")[0].closest("li")).toHaveTextContent("Not shown");
  });

  it("labels a static canvas, readable nodes, controls, and theme scope", () => {
    const { container } = render(<DataModelFlow dataModel={relationshipDataModel} />);

    expect(screen.getByLabelText(/Static data model diagram/)).toBeInTheDocument();
    expect(screen.getByLabelText(/User\. A user with a deliberately long description/)).toBeInTheDocument();
    expect(screen.getByLabelText("Data model diagram controls")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom in data model diagram" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /interactivity/i })).toBeNull();
    expect(container.querySelector(".planner-flow")).toHaveAttribute("data-layout", "compact");
    expect(container.querySelector(".react-flow__edge.animated")).toBeNull();
    expect(container.querySelector(".react-flow__node.selectable")).toBeNull();
    expect(container.querySelector(".react-flow__node.draggable")).toBeNull();
  });

  it("exposes one keyboard-operable 44px-target toggle without a live graph subtree", () => {
    const { container } = render(
      <ExpandableGraphCard
        title="Test Graph"
        eyebrow="Test"
        description="A graph description."
        outline={<p>Persistent outline</p>}
      >
        {() => <div>Static canvas</div>}
      </ExpandableGraphCard>,
    );

    const expand = screen.getByRole("button", { name: "Expand Test Graph" });
    expect(expand).toHaveAttribute("aria-expanded", "false");
    expect(expand).toHaveClass("size-11");
    expect(container.querySelector("[aria-live]")).toBeNull();
    expect(screen.getByText("Persistent outline")).toBeInTheDocument();

    fireEvent.click(expand);
    expect(screen.getByRole("button", { name: "Collapse Test Graph" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Static canvas")).toBeInTheDocument();
  });

  it("reports truthful process availability and directional compact handles", () => {
    const graph = buildProcessGraph(["idea", "brief", "export"], true);
    expect(graph.nodes.find(({ id }) => id === "idea")?.data.available).toBe(true);
    expect(graph.nodes.find(({ id }) => id === "provider")?.data.available).toBe(false);
    expect(graph.edges.every(({ markerEnd }) => markerEnd && typeof markerEnd === "object")).toBe(true);

    const { container } = render(<PlannerProcessOutline availableSteps={["idea", "brief", "export"]} />);
    const details = container.querySelector("details");
    expect(details).toHaveAttribute("open");
    expect(within(details!).getAllByText("App Idea")[0].closest("li")).toHaveTextContent("Available");
    expect(within(details!).getAllByText("Provider Config")[0].closest("li")).toHaveTextContent("Pending");
    expect(screen.getByText("Editable Sections to Markdown Brief")).toBeInTheDocument();
    expect(screen.getByText("Editable Sections to Starter Prompt")).toBeInTheDocument();
  });

  it("derives workspace availability from generated state and individual artifacts", () => {
    const brief = { ...completeProjectBrief, markdownBrief: "", starterPrompt: "Ready" };
    render(<BriefWorkspace brief={brief} onBriefChange={vi.fn()} />);

    for (const label of ["App Idea", "Provider Config", "AI Generation", "Project Brief", "Editable Sections"]) {
      expect(screen.getAllByText(label)[0].closest("li")).toHaveTextContent("Available");
    }
    expect(screen.getAllByText("Markdown Brief")[0].closest("li")).toHaveTextContent("Pending");
    expect(screen.getAllByText("Starter Prompt")[0].closest("li")).toHaveTextContent("Available");

    const risks = screen.getByRole("heading", { name: "Risks & Edge Cases" });
    const planner = screen.getByRole("heading", { name: "Planner Flow" });
    expect(risks.compareDocumentPosition(planner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps multiple graph card instances independently expandable", () => {
    render(
      <>
        {["First", "Second"].map((title) => (
          <ExpandableGraphCard key={title} title={title} description={`${title} graph`} outline={<p>{title} outline</p>}>
            {() => <p>{title} canvas</p>}
          </ExpandableGraphCard>
        ))}
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Expand Second" }));
    expect(screen.queryByText("First canvas")).toBeNull();
    expect(screen.getByText("Second canvas")).toBeInTheDocument();
  });
});
