import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import { BriefWorkspace } from "@/components/planner/brief-workspace";
import { PlannerView, type PlannerViewProps } from "@/components/planner/planner-view";
import { ThemeProvider } from "@/components/theme-provider";
import { DataModelFlow, DataModelOutline } from "@/components/planner/data-model-flow";
import { ExpandableGraphCard } from "@/components/planner/expandable-graph-card";
import { PlannerProcessFlow, PlannerProcessOutline } from "@/components/planner/planner-process-flow";
import { completeProjectBrief } from "@/tests/fixtures/project-brief";
import "@/app/globals.css";

const viewports = [
  { name: "mobile", width: 390, height: 1200 },
  { name: "desktop", width: 1440, height: 1200 },
] as const;

const stableStyles = `
  html { scrollbar-width: none; }
  html::-webkit-scrollbar { display: none; }
  *, *::before, *::after {
    animation: none !important;
    caret-color: transparent !important;
    transition: none !important;
  }
`;

function completedPlannerProps(): PlannerViewProps {
  return {
    idea: "A collaborative research workspace for field observations and synthesis.",
    onIdeaChange: vi.fn(),
    baseUrl: "https://api.example.com/v1",
    onBaseUrlChange: vi.fn(),
    model: "test-model",
    onModelChange: vi.fn(),
    apiKey: "",
    onApiKeyChange: vi.fn(),
    status: "done",
    progress: "",
    section: "done",
    hasBrief: true,
    hasRetryableBriefError: false,
    isGeneratingQuestions: false,
    clarificationOutcome: "answered",
    questions: [],
    regeneratingIndex: null,
    isAddingQuestion: false,
    brief: completeProjectBrief,
    handoffFresh: true,
    isUpdatingExports: false,
    isUpdatingStarterPrompt: false,
    isGeneratingName: false,
    nameGenerationError: null,
    generatedNameSuggestion: null,
    assistantStates: {},
    onStop: vi.fn(),
    onGenerate: vi.fn(),
    onReset: vi.fn(),
    onRetryBrief: vi.fn(),
    onConfirmQuestions: vi.fn(),
    onSkipQuestions: vi.fn(),
    onRegenerateQuestion: vi.fn(),
    onAddQuestion: vi.fn(),
    onBriefChange: vi.fn(),
    onUpdateExports: vi.fn(),
    onUpdateStarterPrompt: vi.fn(),
    onCommitName: vi.fn(),
    onGenerateName: vi.fn(),
    onUseGeneratedName: vi.fn(),
    onDismissGeneratedName: vi.fn(),
    onAskAssistant: vi.fn(),
    onApplyAssistantSuggestion: vi.fn(),
    onDismissAssistant: vi.fn(),
  };
}

test.sequential.each(viewports)(
  "matches the completed integrated PlannerView at $width x $height",
  async ({ name, width, height }) => {
    await page.viewport(width, height);
    localStorage.clear();
    const screen = await render(
      <ThemeProvider>
        <style>{`${stableStyles}
          #planner-workflow {
            height: ${height}px !important;
            min-height: 0 !important;
            overflow: hidden !important;
          }
        `}</style>
        <PlannerView {...completedPlannerProps()} />
      </ThemeProvider>,
    );

    await document.fonts.ready;
    const main = screen.getByRole("main");
    await expect.element(main).toBeVisible();
    expect(screen.container.querySelector("#generation-trace-heading")).toBeNull();
    await expect.element(main).toMatchScreenshot(`phase-6-planner-completed-${name}`);
    await cleanup();
  },
);

test.sequential.each(viewports)(
  "captures expanded Phase 7 graphs at $width px",
  async ({ name, width }) => {
    await page.viewport(width, 1800);
    const screen = await render(
      <ThemeProvider>
        <style>{stableStyles}</style>
        <main className="planner-bg grid min-h-screen gap-6 p-4 sm:p-8">
          <ExpandableGraphCard
            title="Data Model Graph"
            eyebrow="Technical plate"
            description="Explore entities and valid relationships without changing the brief data."
            outline={<DataModelOutline dataModel={completeProjectBrief.dataModel} />}
          >
            {() => <DataModelFlow dataModel={completeProjectBrief.dataModel} />}
          </ExpandableGraphCard>
          <ExpandableGraphCard
            title="Planner Flow"
            eyebrow="Edit and export system flow"
            description="Shows how provider settings and the app idea become an editable brief and export artifacts."
            outline={<PlannerProcessOutline availableSteps={["idea", "provider", "ai", "brief", "edit", "export", "prompt"]} />}
          >
            {() => <PlannerProcessFlow availableSteps={["idea", "provider", "ai", "brief", "edit", "export", "prompt"]} />}
          </ExpandableGraphCard>
        </main>
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Expand Data Model Graph" }));
    await userEvent.click(screen.getByRole("button", { name: "Expand Planner Flow" }));
    await document.fonts.ready;
    await expect.element(screen.getByRole("main")).toMatchScreenshot(`phase-7-expanded-graphs-${name}`);
    await cleanup();
  },
  30_000,
);

test.sequential.each(viewports)(
  "matches the stable Phase 6 domain content at $width px",
  async ({ name, width }) => {
    await page.viewport(width, name === "mobile" ? 3600 : 1600);
    localStorage.clear();
    for (const domain of ["architecture", "delivery", "handoff"] as const) {
      const screen = await render(
        <ThemeProvider>
          <style>{`${stableStyles}
            nav[aria-label="Decision trace"],
            section[id]:not(#${domain}) { display: none !important; }
          `}</style>
          <main className="planner-bg min-h-screen p-4 sm:p-8">
            <BriefWorkspace
              brief={completeProjectBrief}
              handoffFresh
              onBriefChange={vi.fn()}
              onUpdateExports={vi.fn()}
              onUpdateStarterPrompt={vi.fn()}
              onGenerateName={vi.fn()}
            />
          </main>
        </ThemeProvider>,
      );
      await document.fonts.ready;
      const section = screen.container.querySelector<HTMLElement>(`#${domain}`);
      expect(section).not.toBeNull();
      await expect.element(section!).toMatchScreenshot(`phase-6-${domain}-${name}`);
      await cleanup();
    }
  },
  30_000,
);
