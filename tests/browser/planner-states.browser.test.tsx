import axe from "axe-core";
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import type { PlannerViewProps } from "@/components/planner/planner-view";
import { PlannerView } from "@/components/planner/planner-view";
import { GenerationStatus } from "@/components/planner/generation-status";
import { InlineCardAssistant } from "@/components/planner/inline-card-assistant";
import { MarkdownExportCard } from "@/components/planner/markdown-export-card";
import "@/app/globals.css";

vi.mock("@/components/planner/brief-workspace", () => ({
  BriefWorkspace: () => <div data-testid="brief-fixture">Generated brief workspace</div>,
}));

const question = {
  question: "Who is this plan for?",
  options: [
    { label: "Teams", description: "People collaborating on delivery." },
    { label: "Individuals", description: "People planning independently." },
  ],
};

const emptyBrief: PlannerViewProps["brief"] = {
  appName: "Fixture",
  appSummary: "A generated fixture brief.",
  targetUsers: [],
  coreFeatures: [],
  recommendedTechStack: { frontend: [], backend: [], ai: [] },
  pagesRoutes: [],
  dataModel: { entities: [], relationships: [] },
  buildPhases: { initialPhase: { name: "", goals: [], deliverables: [] }, milestones: [] },
  risksEdgeCases: [],
  starterPrompt: "",
  markdownBrief: "",
};

function fixture(overrides: Partial<PlannerViewProps> = {}): PlannerViewProps {
  return {
    idea: "A deterministic planner fixture",
    onIdeaChange: vi.fn(),
    baseUrl: "https://api.example.com/v1",
    onBaseUrlChange: vi.fn(),
    model: "test-model",
    onModelChange: vi.fn(),
    apiKey: "",
    onApiKeyChange: vi.fn(),
    status: "idle",
    progress: "",
    section: "done",
    error: undefined,
    hasBrief: false,
    hasRetryableBriefError: false,
    isGeneratingQuestions: false,
    clarificationOutcome: "none",
    questions: [],
    regeneratingIndex: null,
    isAddingQuestion: false,
    brief: emptyBrief,
    handoffFresh: false,
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
    ...overrides,
  };
}

const states = [
  {
    name: "question-loading",
    props: { status: "questions", isGeneratingQuestions: true } as const,
    expected: "Thinking of questions…",
    liveSources: 1,
  },
  {
    name: "questions-ready",
    props: {
      status: "questions",
      questions: [question] as PlannerViewProps["questions"],
    } as const,
    expected: question.question,
    liveSources: 0,
  },
  {
    name: "question-error",
    props: { status: "error", error: "Provider unavailable" } as const,
    expected: "Provider unavailable",
    liveSources: 1,
  },
  {
    name: "generating",
    props: {
      status: "generating",
      section: "overview",
      progress: "Connecting to provider…",
      clarificationOutcome: "answered",
    } as const,
    expected: "Generating brief overview…",
    liveSources: 1,
  },
  {
    name: "done-brief",
    props: {
      status: "done",
      section: "done",
      hasBrief: true,
      clarificationOutcome: "answered",
    } as const,
    expected: "Generated brief workspace",
    liveSources: 0,
  },
] as const;

const widths = [320, 390, 768, 1024, 1440] as const;

test.sequential.each(widths)("keeps every active planner state responsive at %ipx", async (width) => {
  await page.viewport(width, 900);

  for (const state of states) {
    const screen = await render(<PlannerView {...fixture(state.props)} />);
    await expect.element(screen.getByText(state.expected)).toBeVisible();

    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    expect(
      screen.container.querySelectorAll('[role="status"], [role="alert"]')
    ).toHaveLength(state.liveSources);
    expect(screen.container.querySelector("[aria-live]")).toBe(
      state.liveSources === 0 ? null : screen.container.querySelector('[role="status"], [role="alert"]')
    );

    if (state.name === "questions-ready") {
      const exactGenerate = Array.from(screen.container.querySelectorAll("button")).filter(
        (button) => button.textContent?.trim() === "Generate"
      );
      expect(exactGenerate).toHaveLength(0);
      await expect.element(screen.getByRole("button", { name: "Generate brief" })).toBeVisible();
    }

    if (state.name === "done-brief") {
      expect(screen.container.querySelector('[role="status"]')).toBeNull();
      expect(screen.container.querySelector("#generation-trace-heading")).toBeNull();
    } else {
      expect(screen.container.querySelector("#generation-trace-heading")).not.toBeNull();
    }

    await cleanup();
  }
});

test.sequential.each([
  ["questions", fixture({ status: "questions", questions: [question] })],
  ["question error", fixture({ status: "error", error: "Provider unavailable" })],
] as const)("has no axe violations for %s", async (_name, props) => {
  await page.viewport(390, 900);
  const screen = await render(<PlannerView {...props} />);
  const results = await axe.run(screen.container);
  const violations = results.violations.map(({ id, help }) => `${id}: ${help}`);
  expect(results.violations, violations.join("\n")).toEqual([]);
  await cleanup();
});

test.sequential("routes a question error Retry to question generation", async () => {
  const onGenerate = vi.fn();
  const screen = await render(
    <PlannerView
      {...fixture({ status: "error", error: "Provider unavailable", onGenerate })}
    />
  );

  await userEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(onGenerate).toHaveBeenCalledOnce();
  await cleanup();
});

test.sequential("announces generation stage transitions through one persistent live region", async () => {
  const screen = await render(
    <GenerationStatus status="generating" progress="Connecting" section="overview" />,
  );
  const liveRegion = screen.getByRole("status").element();
  expect(liveRegion.textContent).toContain("Generating brief overview");

  await screen.rerender(
    <GenerationStatus status="generating" progress="Working" section="starter-prompt" />,
  );
  expect(screen.getByRole("status").element()).toBe(liveRegion);
  expect(liveRegion.textContent).toContain("Generating starter prompt");

  await screen.rerender(
    <GenerationStatus status="generating" progress="Working" section="formatting" />,
  );
  expect(screen.getByRole("status").element()).toBe(liveRegion);
  expect(liveRegion.textContent).toContain("Formatting markdown brief");
  await cleanup();
});

test.sequential("announces assistant and export transitions through their live regions", async () => {
  const assistant = await render(
    <InlineCardAssistant sectionId="appSummary" onAsk={vi.fn()} />,
  );
  await userEvent.click(assistant.getByRole("button", { name: "Ask AI" }));
  const assistantRegion = assistant.container.querySelector<HTMLElement>('[aria-live="polite"]')!;
  expect(assistantRegion.textContent).toBe("");

  await assistant.rerender(
    <InlineCardAssistant
      sectionId="appSummary"
      state={{ isLoading: true }}
      onAsk={vi.fn()}
    />,
  );
  expect(assistant.container.querySelector('[aria-live="polite"]')).toBe(assistantRegion);
  expect(assistantRegion.textContent).toContain("Thinking");

  await assistant.rerender(
    <InlineCardAssistant
      sectionId="appSummary"
      state={{ isLoading: false, answer: "Use a clearer summary." }}
      onAsk={vi.fn()}
    />,
  );
  expect(assistant.container.querySelector('[aria-live="polite"]')).toBe(assistantRegion);
  expect(assistantRegion.textContent).toContain("Assistant response ready");
  await cleanup();

  const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  const exportCard = await render(<MarkdownExportCard markdown="# Project brief" />);
  const exportRegion = exportCard.getByRole("status").element();
  expect(exportRegion.textContent).toBe("");
  await userEvent.click(exportCard.getByRole("button", { name: "Copy" }));
  expect(exportCard.getByRole("status").element()).toBe(exportRegion);
  expect(exportRegion.textContent).toContain("Markdown brief copied to clipboard");
  expect(writeText).toHaveBeenCalledWith("# Project brief");
  writeText.mockRestore();
  await cleanup();
});
