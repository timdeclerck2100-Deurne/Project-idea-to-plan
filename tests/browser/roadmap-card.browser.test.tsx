import { useState } from "react";
import { expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import { RoadmapCard } from "@/components/planner/roadmap-card";
import type { Roadmap } from "@/lib/brief-schema";
import "@/app/globals.css";

const roadmap: Roadmap = {
  initialPhase: {
    name: "Research foundation",
    goals: ["Validate workflows", "Confirm access"],
    deliverables: ["Interview synthesis"],
  },
  milestones: [
    {
      name: "Team workspace",
      goals: ["Support collaboration"],
      deliverables: ["Shared dashboard"],
    },
  ],
};

function RoadmapHarness() {
  const [value, setValue] = useState(roadmap);
  return <RoadmapCard roadmap={value} onChange={setValue} />;
}

test.sequential("focuses the destination action after a cross-phase keyboard-equivalent move", async () => {
  const screen = await render(<RoadmapHarness />);
  await userEvent.click(screen.getByRole("button", {
    name: "Actions for goal Confirm access, phase 1, item 2",
  }));
  await userEvent.click(screen.getByRole("button", {
    name: "Move goal Confirm access, phase 1, item 2 to next phase",
  }));

  const destination = screen.getByRole("button", {
    name: "Actions for goal Confirm access, phase 2, item 2",
  });
  await expect.element(destination).toHaveFocus();
  await expect.element(screen.getByTestId("roadmap-announcement")).toHaveTextContent(
    "Moved goal Confirm access, phase 1, item 2 to Milestone 1.",
  );
  await cleanup();
});

test.sequential.each([320, 768, 1024] as const)(
  "keeps roadmap controls usable without application overflow at %ipx",
  async (width) => {
    await page.viewport(width, 1200);
    const screen = await render(
      <main className="planner-bg box-border min-h-screen p-3 sm:p-6">
        <RoadmapHarness />
      </main>,
    );

    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    await expect.element(screen.getByRole("textbox", {
      name: "Add goal to Research foundation, phase 1",
    })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Add Goal to phase 1" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Add Milestone" })).toBeVisible();

    if (width === 320) {
      await userEvent.click(screen.getByRole("button", {
        name: "Actions for goal Validate workflows, phase 1, item 1",
      }));
      const toolbar = document.querySelector<HTMLElement>("[data-roadmap-action-toolbar]")!;
      const card = toolbar.closest<HTMLElement>("[data-roadmap-card]")!;
      const toolbarRect = toolbar.getBoundingClientRect();
      const roadmapCardRect = card.getBoundingClientRect();
      expect(toolbarRect.left).toBeGreaterThanOrEqual(Math.max(0, roadmapCardRect.left));
      expect(toolbarRect.right).toBeLessThanOrEqual(Math.min(window.innerWidth, roadmapCardRect.right));
      expect(toolbarRect.top).toBeGreaterThanOrEqual(Math.max(0, roadmapCardRect.top));
      expect(toolbarRect.bottom).toBeLessThanOrEqual(Math.min(window.innerHeight, roadmapCardRect.bottom));

      const milestoneControls = document.querySelector<HTMLElement>("[data-roadmap-milestone-controls]")!;
      const milestoneCard = milestoneControls.closest<HTMLElement>("[data-roadmap-phase]")!;
      const cardRect = milestoneCard.getBoundingClientRect();
      milestoneControls.querySelectorAll<HTMLElement>("button, input").forEach((control) => {
        const rect = control.getBoundingClientRect();
        expect(rect.left).toBeGreaterThanOrEqual(Math.max(0, cardRect.left));
        expect(rect.right).toBeLessThanOrEqual(Math.min(window.innerWidth, cardRect.right));
        expect(rect.top).toBeGreaterThanOrEqual(Math.max(0, cardRect.top));
        expect(rect.bottom).toBeLessThanOrEqual(Math.min(window.innerHeight, cardRect.bottom));
      });
    }

    const input = screen.getByRole("textbox", {
      name: "Add goal to Research foundation, phase 1",
    });
    await userEvent.fill(input, `Reachable at ${width}`);
    await userEvent.click(screen.getByRole("button", { name: "Add Goal to phase 1" }));
    await expect.element(screen.getByText(`Reachable at ${width}`)).toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    await cleanup();
  },
);
