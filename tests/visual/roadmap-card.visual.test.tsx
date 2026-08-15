import { useState } from "react";
import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import { RoadmapCard } from "@/components/planner/roadmap-card";
import type { Roadmap } from "@/lib/brief-schema";
import "@/app/globals.css";

const roadmap: Roadmap = {
  initialPhase: { name: "Research foundation", goals: [], deliverables: [] },
  milestones: [
    { name: "Team workspace", goals: [], deliverables: [] },
    { name: "Insight automation", goals: [], deliverables: [] },
  ],
};

function RoadmapHarness() {
  const [value, setValue] = useState(roadmap);
  return <RoadmapCard roadmap={value} onChange={setValue} />;
}

test.sequential.each([
  { name: "mobile", width: 390 },
  { name: "desktop", width: 1440 },
] as const)("matches the bounded roadmap at $width px", async ({ name, width }) => {
  await page.viewport(width, 1200);
  const screen = await render(
    <>
      <style>{`
        html { scrollbar-width: none; }
        html::-webkit-scrollbar { display: none; }
        *, *::before, *::after {
          animation: none !important;
          caret-color: transparent !important;
          transition: none !important;
        }
      `}</style>
      <main
        data-testid="roadmap-visual"
        className="planner-bg box-border overflow-hidden p-3 sm:p-6"
        style={{ width }}
      >
        <RoadmapHarness />
      </main>
    </>,
  );

  await document.fonts.ready;
  const wrapper = screen.getByTestId("roadmap-visual");
  await expect.element(wrapper).toBeVisible();
  await expect.element(wrapper).toMatchScreenshot(`roadmap-card-${name}`);
  await cleanup();
});
