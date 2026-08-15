import axe from "axe-core";
import { expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import { DataModelFlow, DataModelOutline } from "@/components/planner/data-model-flow";
import { ExpandableGraphCard } from "@/components/planner/expandable-graph-card";
import { PlannerProcessFlow, PlannerProcessOutline } from "@/components/planner/planner-process-flow";
import { completeProjectBrief } from "@/tests/fixtures/project-brief";
import type { ProjectBrief } from "@/lib/brief-schema";
import "@/app/globals.css";

const longDataModel = {
  entities: [
    ...completeProjectBrief.dataModel.entities,
    {
      name: " Evidence ",
      description: "A deliberately long entity description that wraps across several lines while retaining its authored sixteen pixel body text and remaining clear at every supported viewport width.",
      fields: Array.from({ length: 10 }, (_, index) => ({ name: `longFieldName${index}`, type: "varchar(255)" })),
    },
    { name: "Evidence", description: "Duplicate normalized name", fields: [] },
    { name: "", description: "Unnamed", fields: [] },
  ],
  relationships: [
    ...completeProjectBrief.dataModel.relationships,
    { source: " Evidence ", target: "Project", label: "ambiguous evidence", type: "many-to-one" },
    { source: "Missing", target: "Project", label: "missing evidence", type: "many-to-one" },
    { source: "", target: "Project", label: "empty evidence", type: "many-to-one" },
  ],
} satisfies ProjectBrief["dataModel"];

function viewportZoom(flow: HTMLElement) {
  const transform = flow.querySelector<HTMLElement>(".react-flow__viewport")?.style.transform ?? "";
  const scale = transform.match(/scale\(([^)]+)\)/)?.[1];
  return Number(scale);
}

async function tabToElement(element: HTMLElement, limit = 60) {
  for (let index = 0; index < limit; index += 1) {
    await userEvent.keyboard("{Tab}");
    if (document.activeElement === element) return;
  }
  throw new Error(`Element was not reachable by keyboard: ${element.getAttribute("aria-label") ?? element.textContent}`);
}

async function expectVisibleKeyboardFocus(element: HTMLElement) {
  await tabToElement(element);
  const style = getComputedStyle(element);
  expect(
    (Number.parseFloat(style.outlineWidth) > 0 && style.outlineStyle !== "none")
      || style.boxShadow !== "none",
  ).toBe(true);
}

async function waitForLayout(flow: HTMLElement, layout: "compact" | "wide") {
  await expect.poll(() => flow.dataset.layout).toBe(layout);
}

test.sequential.each([320, 390, 768, 1024, 1440] as const)(
  "preserves graph text, pan, controls, outlines, and accessibility at %ipx",
  async (width) => {
    await page.viewport(width, 1200);
    const screen = await render(
      <main data-testid="graph-test-page" className="planner-bg grid min-w-0 gap-6 p-2 sm:p-4">
        <ExpandableGraphCard
          title="Data Model Graph"
          eyebrow="Technical plate"
          description="Explore entities and valid relationships without changing the brief data."
          outline={<DataModelOutline dataModel={longDataModel} />}
        >
          {() => <DataModelFlow dataModel={longDataModel} />}
        </ExpandableGraphCard>
        <ExpandableGraphCard
          title="Planner Flow"
          eyebrow="Edit and export system flow"
          description="Shows how provider settings and the app idea become an editable brief and export artifacts."
          outline={<PlannerProcessOutline availableSteps={["idea", "provider", "ai", "brief", "edit", "export"]} />}
        >
          {() => <PlannerProcessFlow availableSteps={["idea", "provider", "ai", "brief", "edit", "export"]} />}
        </ExpandableGraphCard>
      </main>,
    );

    await expect.element(screen.getByText(/1 of 4 relationships shown/)).toBeVisible();
    await expect.element(screen.getByText("ambiguous", { exact: true })).toBeVisible();
    const missingText = Array.from(screen.container.querySelectorAll<HTMLElement>("li")).find((item) => item.textContent?.includes("Missing to Project"));
    expect(missingText).toBeDefined();
    expect(getComputedStyle(missingText!).display).not.toBe("none");
    const dataSummary = screen.getByText(/Data model outline/);
    await userEvent.click(dataSummary);
    await expect.element(screen.getByText("Entities", { exact: true })).not.toBeVisible();
    await userEvent.click(dataSummary);
    await expect.element(screen.getByText("Entities", { exact: true })).toBeVisible();

    const expand = screen.getByRole("button", { name: "Expand Data Model Graph" });
    await expectVisibleKeyboardFocus(expand.element() as HTMLElement);
    await userEvent.keyboard("{Enter}");
    await expect.element(screen.getByRole("button", { name: "Zoom in data model diagram" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Fit data model diagram to view" })).toBeVisible();
    expect(screen.container.querySelector('button[aria-label*="interactiv" i]')).toBeNull();
    await expectVisibleKeyboardFocus(
      screen.getByRole("button", { name: "Zoom in data model diagram" }).element() as HTMLElement,
    );

    const processExpand = screen.getByRole("button", { name: "Expand Planner Flow" });
    await userEvent.click(processExpand);
    await expect.element(screen.getByRole("button", { name: "Zoom in edit and export system flow" })).toBeVisible();

    const flows = Array.from(screen.container.querySelectorAll<HTMLElement>(".planner-flow[data-testid]"));
    expect(flows).toHaveLength(2);
    await waitForLayout(flows[0], width < 800 ? "compact" : "wide");
    await waitForLayout(flows[1], width < 1280 ? "compact" : "wide");
    for (const flow of flows) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      expect(viewportZoom(flow)).toBeGreaterThanOrEqual(1);
      expect(flow.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth + 0.5);
      expect(flow.querySelector(".react-flow__pane")).not.toBeNull();
      expect(flow.querySelector(".react-flow__controls")).not.toBeNull();
      expect(flow.classList.contains("blueprint-surface")).toBe(true);
      const nodeText = flow.querySelector<HTMLElement>(".planner-flow-node p, .planner-flow-node h4");
      expect(nodeText).not.toBeNull();
      expect(Number.parseFloat(getComputedStyle(nodeText!).fontSize)).toBeGreaterThanOrEqual(14);

      const edgeText = flow.querySelector<SVGTextElement>(".react-flow__edge-text");
      if (edgeText) {
        expect(Number.parseFloat(getComputedStyle(edgeText).fontSize)).toBeGreaterThanOrEqual(14);
        expect(getComputedStyle(edgeText).fill).not.toBe("rgb(153, 153, 153)");
      }

      const attribution = flow.querySelector<HTMLAnchorElement>(".react-flow__attribution a");
      expect(attribution).not.toBeNull();
      const attributionStyle = getComputedStyle(attribution!);
      const attributionColor = attributionStyle.color;
      const attributionBackground = attributionStyle.backgroundColor;
      expect(Number.parseFloat(attributionStyle.fontSize)).toBeGreaterThanOrEqual(14);
      expect(attribution!.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
      expect(attributionColor).not.toBe("rgb(153, 153, 153)");
      expect(getComputedStyle(attribution!.parentElement!).backgroundColor).not.toBe("rgba(255, 255, 255, 0.5)");

      await userEvent.hover(attribution!);
      expect(getComputedStyle(attribution!).backgroundColor).not.toBe(attributionBackground);
      expect(getComputedStyle(attribution!).color).not.toBe(attributionColor);

      await tabToElement(attribution!);
      expect(attribution!.matches(":focus-visible")).toBe(true);
      expect(getComputedStyle(attribution!).outlineStyle).toBe("solid");

      const control = flow.querySelector<HTMLButtonElement>(".react-flow__controls-button");
      expect(control).not.toBeNull();
      expect(getComputedStyle(control!).color).not.toBe("rgb(153, 153, 153)");
    }
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);

    expect(screen.container.querySelector('[data-testid="data-model-flow"] .react-flow__node')).not.toBeNull();
    expect(screen.container.querySelector('[data-testid="planner-process-flow"] .react-flow__node')).not.toBeNull();

    const axeResults = await axe.run(screen.getByTestId("graph-test-page").element());
    const violations = axeResults.violations.map(({ id, help }) => `${id}: ${help}`);
    expect(axeResults.violations, violations.join("\n")).toEqual([]);

    if (width === 1440) {
      await page.viewport(390, 1200);
      await waitForLayout(flows[0], "compact");
      await waitForLayout(flows[1], "compact");
      for (const flow of flows) expect(viewportZoom(flow)).toBeGreaterThanOrEqual(1);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    }
    await cleanup();
  },
  30_000,
);
