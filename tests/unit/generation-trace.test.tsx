import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GenerationTrace } from "@/components/planner/generation-trace";

function stage(name: string) {
  return screen.getByText(name).closest("li")!;
}

function traceHeader() {
  return screen.getByRole("heading", { name: "Generation trace" }).parentElement!;
}

describe("GenerationTrace", () => {
  it.each([
    {
      name: "idle",
      props: { status: "idle", section: "done", clarificationOutcome: "none" },
      active: "Idea",
      header: "Ready",
      activeState: "Current step",
    },
    {
      name: "questions loading",
      props: {
        status: "questions",
        section: "done",
        clarificationOutcome: "none",
        isGeneratingQuestions: true,
      },
      active: "Clarify",
      header: "Preparing Questions",
      activeState: "Preparing Questions",
    },
    {
      name: "questions ready",
      props: { status: "questions", section: "done", clarificationOutcome: "none" },
      active: "Clarify",
      header: "Awaiting Answers",
      activeState: "Awaiting Answers",
    },
    {
      name: "answered overview",
      props: { status: "generating", section: "overview", clarificationOutcome: "answered" },
      active: "Plan",
      header: "Generating…",
      activeState: "Current step",
      clarificationState: "Answered",
    },
    {
      name: "skipped overview",
      props: { status: "generating", section: "overview", clarificationOutcome: "skipped" },
      active: "Plan",
      header: "Generating…",
      activeState: "Current step",
      clarificationState: "Skipped",
    },
    {
      name: "answered starter prompt",
      props: {
        status: "generating",
        section: "starter-prompt",
        clarificationOutcome: "answered",
      },
      active: "Handoff",
      header: "Generating…",
      activeState: "Current step",
      clarificationState: "Answered",
    },
    {
      name: "skipped formatting",
      props: { status: "generating", section: "formatting", clarificationOutcome: "skipped" },
      active: "Handoff",
      header: "Generating…",
      activeState: "Current step",
      clarificationState: "Skipped",
    },
  ] as const)("maps $name truthfully", ({ props, active, header, activeState, clarificationState }) => {
    render(<GenerationTrace {...props} />);

    expect(stage(active)).toHaveAttribute("aria-current", "step");
    expect(within(stage(active)).getByText(activeState)).toBeInTheDocument();
    expect(within(traceHeader()).getByText(header)).toBeInTheDocument();
    if (clarificationState) {
      expect(within(stage("Clarify")).getByText(clarificationState)).toBeInTheDocument();
    }
    expect(screen.getByRole("list", { name: "Project generation stages" })).toBeInTheDocument();
    expect(document.querySelector("[aria-live]")).not.toBeInTheDocument();
  });

  it.each(["answered", "skipped"] as const)(
    "completes every stage while preserving the %s clarification outcome",
    (clarificationOutcome) => {
      render(
        <GenerationTrace
          status="done"
          section="done"
          clarificationOutcome={clarificationOutcome}
        />
      );

      expect(document.querySelector('[aria-current="step"]')).not.toBeInTheDocument();
      expect(within(stage("Clarify")).getByText(
        clarificationOutcome === "answered" ? "Answered" : "Skipped"
      )).toBeInTheDocument();
      expect(within(traceHeader()).getByText("Complete")).toBeInTheDocument();
    }
  );

  it("uses a distinct skip icon instead of a completion check", () => {
    render(
      <GenerationTrace status="done" section="done" clarificationOutcome="skipped" />
    );

    expect(stage("Clarify").querySelector(".lucide-skip-forward")).toBeInTheDocument();
    expect(stage("Clarify").querySelector(".lucide-check")).not.toBeInTheDocument();
  });

  it.each([
    ["question", "done", false, "none", "Clarify"],
    ["brief overview after answers", "overview", true, "answered", "Plan"],
    ["brief overview after skip", "overview", true, "skipped", "Plan"],
    ["starter prompt after answers", "starter-prompt", true, "answered", "Handoff"],
    ["formatting after skip", "formatting", true, "skipped", "Handoff"],
  ] as const)(
    "maps a %s error to the correct stage",
    (_name, section, hasRetryableBriefError, clarificationOutcome, active) => {
      render(
        <GenerationTrace
          status="error"
          section={section}
          hasRetryableBriefError={hasRetryableBriefError}
          clarificationOutcome={clarificationOutcome}
        />
      );

      expect(stage(active)).toHaveAttribute("aria-current", "step");
      expect(within(stage(active)).getByText("Error")).toBeInTheDocument();
      if (clarificationOutcome !== "none") {
        expect(within(stage("Clarify")).getByText(
          clarificationOutcome === "answered" ? "Answered" : "Skipped"
        )).toBeInTheDocument();
      }
    }
  );
});
