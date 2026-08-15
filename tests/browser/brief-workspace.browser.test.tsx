import { useState } from "react";
import axe from "axe-core";
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import { BriefWorkspace } from "@/components/planner/brief-workspace";
import { RoadmapCard } from "@/components/planner/roadmap-card";
import type { Roadmap } from "@/lib/brief-schema";
import { completeProjectBrief } from "@/tests/fixtures/project-brief";
import "@/app/globals.css";

const domainIds = ["purpose", "people", "product", "architecture", "delivery", "handoff"];
const widths = [390, 768, 1024, 1440] as const;

function RoadmapHarness() {
  const [roadmap, setRoadmap] = useState<Roadmap>(completeProjectBrief.buildPhases);
  return <RoadmapCard roadmap={roadmap} onChange={setRoadmap} />;
}

test.sequential.each(widths)("keeps the complete decision workspace responsive at %ipx", async (width) => {
  await page.viewport(width, 1200);
  const screen = await render(
    <main>
      <BriefWorkspace
        brief={completeProjectBrief}
        onBriefChange={vi.fn()}
        onUpdateExports={vi.fn()}
        onUpdateStarterPrompt={vi.fn()}
        onGenerateName={vi.fn()}
      />
    </main>,
  );

  const domains = Array.from(screen.container.querySelectorAll("section[id]"));
  expect(domains.map(({ id }) => id)).toEqual(domainIds);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);

  const nav = screen.container.querySelector<HTMLElement>('nav[aria-label="Decision trace"]');
  expect(nav).not.toBeNull();
  const navList = screen.container.querySelector<HTMLOListElement>(
    '[data-testid="decision-trace-links"]',
  );
  expect(navList).not.toBeNull();
  const links = Array.from(nav?.querySelectorAll<HTMLAnchorElement>("a") ?? []);
  expect(links.map((link) => link.hash)).toEqual(domainIds.map((id) => `#${id}`));
  if (width < 1024 && navList) {
    const items = Array.from(navList.children) as HTMLElement[];
    const listRect = navList.getBoundingClientRect();
    const continuationRect = items
      .map((item) => item.getBoundingClientRect())
      .find((rect) => rect.left < listRect.right && rect.right > listRect.right);
    expect(navList.scrollWidth).toBeGreaterThan(navList.clientWidth);
    expect(getComputedStyle(navList).scrollbarWidth).toBe("none");
    expect(continuationRect).toBeDefined();
  }

  links.forEach((link, index) => {
    expect(document.querySelector(link.hash)).toBe(domains[index]);
    if (width < 1024) link.scrollIntoView({ block: "nearest", inline: "nearest" });
    link.focus();
    expect(document.activeElement).toBe(link);
    if (width < 1024 && navList) {
      const linkRect = link.getBoundingClientRect();
      const listRect = navList.getBoundingClientRect();
      expect(linkRect.left - 4).toBeGreaterThanOrEqual(listRect.left - 0.5);
      expect(linkRect.right + 4).toBeLessThanOrEqual(listRect.right + 0.5);
    }
  });

  expect(screen.container.querySelectorAll("h2")).toHaveLength(6);
  domains.forEach((domain) => {
    expect(domain.querySelectorAll(":scope > div > header h2")).toHaveLength(1);
    expect(domain.querySelectorAll("h3").length).toBeGreaterThan(0);
    const headingLevels = Array.from(domain.querySelectorAll("h2, h3")).map(
      (heading) => Number(heading.tagName.slice(1)),
    );
    expect(headingLevels[0]).toBe(2);
    expect(headingLevels.slice(1).every((level) => level === 3)).toBe(true);
  });

  const focusableDomains = Array.from(
    screen.container.querySelectorAll("section[id] input, section[id] textarea, section[id] button, section[id] a"),
  ).map((element) => element.closest("section[id]")?.id);
  expect(focusableDomains).toEqual(
    [...focusableDomains].sort((a, b) => domainIds.indexOf(a ?? "") - domainIds.indexOf(b ?? "")),
  );

  await cleanup();
});

test.sequential.each([390, 1440] as const)("has no axe violations at %ipx", async (width) => {
  await page.viewport(width, 1200);
  await render(
    <main>
      <BriefWorkspace
        brief={completeProjectBrief}
        onBriefChange={vi.fn()}
        onUpdateExports={vi.fn()}
        onUpdateStarterPrompt={vi.fn()}
        onGenerateName={vi.fn()}
      />
    </main>,
  );
  const results = await axe.run({
    include: [["main"]],
  });
  const violations = results.violations.map(({ id, help }) => `${id}: ${help}`);
  expect(results.violations, violations.join("\n")).toEqual([]);
  await cleanup();
});

test.sequential.each([390, 1440] as const)(
  "keeps the roadmap sequential, operable, and accessible at %ipx",
  async (width) => {
    await page.viewport(width, 1600);
    const screen = await render(
      <main className="min-w-0 p-4">
        <style>{"*, *::before, *::after { animation: none !important; caret-color: transparent !important; transition: none !important; }"}</style>
        <RoadmapHarness />
      </main>,
    );

    const sequence = screen.container.querySelector<HTMLElement>('[data-testid="roadmap-sequence"]');
    expect(sequence).not.toBeNull();
    expect(Array.from(sequence!.children).map((element) =>
      element.getAttribute("data-roadmap-phase") ?? element.getAttribute("data-roadmap-add"),
    )).toEqual(["initial", "milestone-1", "milestone-2", "true"]);
    expect(getComputedStyle(sequence!).gridTemplateColumns.split(" ")).toHaveLength(width === 390 ? 1 : 2);
    expect(sequence!.scrollWidth).toBeLessThanOrEqual(sequence!.clientWidth);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    const phases = Array.from(sequence!.querySelectorAll<HTMLElement>("[data-roadmap-phase]"));
    const visibleFocusable = Array.from(
      sequence!.querySelectorAll<HTMLElement>("input, button, summary"),
    ).filter((element) =>
      element.offsetParent !== null
      && !(element as HTMLButtonElement).disabled
      && (element.tagName === "SUMMARY" || !element.closest("details:not([open])")),
    );
    const focusOrder = visibleFocusable.map((element) => {
      const phase = element.closest<HTMLElement>("[data-roadmap-phase]");
      return phase ? phases.indexOf(phase) : phases.length;
    });
    expect(focusOrder).toEqual([...focusOrder].sort((a, b) => a - b));
    visibleFocusable.forEach((element) => {
      element.focus();
      expect(document.activeElement).toBe(element);
    });

    const announcement = screen.getByTestId("roadmap-announcement").element();
    expect(announcement.textContent).toBe("");
    await userEvent.click(screen.getByLabelText("Actions for goal Validate the capture workflow, phase 1, item 1"));
    await userEvent.click(
      screen.getByRole("button", { name: "Move goal Validate the capture workflow, phase 1, item 1 to next phase" }),
    );
    expect(screen.getByTestId("roadmap-announcement").element()).toBe(announcement);
    expect(phases[0].textContent).not.toContain("Validate the capture workflow");
    expect(phases[1].textContent).toContain("Validate the capture workflow");
    await expect.element(screen.getByTestId("roadmap-announcement")).toHaveTextContent(
      "Moved goal Validate the capture workflow, phase 1, item 1 to Milestone 1.",
    );

    const roadmapAxe = await axe.run({ include: [['[data-testid="roadmap-sequence"]']] });
    const violations = roadmapAxe.violations.map(({ id, help }) => `${id}: ${help}`);
    expect(roadmapAxe.violations, violations.join("\n")).toEqual([]);
    await cleanup();
  },
);

test.sequential("activates visible roadmap add buttons with pointer clicks", async () => {
  await page.viewport(1024, 1200);
  const screen = await render(<RoadmapHarness />);
  const goalInput = screen.getByRole("textbox", {
    name: "Add goal to Research foundation, phase 1",
  });
  const goalButton = screen.getByRole("button", { name: "Add Goal to phase 1" });
  const deliverableInput = screen.getByRole("textbox", {
    name: "Add deliverable to Research foundation, phase 1",
  });
  const deliverableButton = screen.getByRole("button", { name: "Add Deliverable to phase 1" });
  await expect.element(goalButton).toBeDisabled();
  await expect.element(deliverableButton).toBeDisabled();
  expect(goalButton.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  expect(deliverableButton.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  await userEvent.fill(goalInput, "Pointer goal");
  await userEvent.click(goalButton);
  await userEvent.fill(deliverableInput, "Pointer output");
  await userEvent.click(deliverableButton);
  await expect.element(screen.getByText("Pointer goal")).toBeVisible();
  await expect.element(screen.getByText("Pointer output")).toBeVisible();
  await cleanup();
});

test.sequential("renders actual DnD provider handles; WebDriver pointer synthesis is unsupported for this dnd-kit version", async () => {
  const screen = await render(<RoadmapHarness />);
  // WebDriver cannot reliably synthesize this dnd-kit's pointer lifecycle; production
  // wiring is checked here and pure drag-end transformations remain unit-covered.
  const itemHandle = screen.getByRole("button", {
    name: "Drag goal Validate the capture workflow, phase 1, item 1",
  });
  const milestoneHandle = screen.getByRole("button", {
    name: "Drag Team workspace, milestone 1",
  });
  await expect.element(itemHandle).toBeVisible();
  await expect.element(milestoneHandle).toBeVisible();
  expect(getComputedStyle(itemHandle.element()).touchAction).toBe("none");
  expect(screen.container.querySelectorAll("[data-roadmap-drop]").length).toBeGreaterThan(1);
  await cleanup();
});
