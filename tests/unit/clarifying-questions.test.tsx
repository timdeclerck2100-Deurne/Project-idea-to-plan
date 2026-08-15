import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ClarifyingQuestions } from "@/components/planner/clarifying-questions";

const questions = [
  {
    question: "Who will use the tool?",
    options: [
      { label: "Teams", description: "Internal product teams." },
      { label: "Individuals", description: "Independent users." },
    ],
  },
  {
    question: "Where will it run?",
    options: [
      { label: "Web", description: "In a browser." },
      { label: "Desktop", description: "As an installed application." },
    ],
  },
];

describe("ClarifyingQuestions", () => {
  it("renders option descriptions as explanatory body copy", () => {
    render(
      <ClarifyingQuestions
        questions={questions}
        onConfirm={vi.fn()}
        onSkip={vi.fn()}
      />
    );

    expect(screen.getByText("Internal product teams.")).toHaveClass("text-base");
    expect(screen.getByText("Internal product teams.")).not.toHaveClass("text-sm");
  });

  it("uses exclusive radio groups and confirms answers keyed by question text", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ClarifyingQuestions
        questions={questions}
        onConfirm={onConfirm}
        onSkip={vi.fn()}
      />
    );

    const teams = screen.getByRole("radio", { name: /Teams/ });
    const individuals = screen.getByRole("radio", { name: /Individuals/ });
    expect(screen.getByText("Internal product teams.")).toBeVisible();
    expect(screen.getByText("Independent users.")).toBeVisible();

    await user.click(teams);
    await user.click(individuals);
    expect(teams).not.toBeChecked();
    expect(individuals).toBeChecked();

    await user.click(screen.getByRole("radio", { name: /Web/ }));
    await user.click(screen.getByRole("button", { name: "Generate brief" }));

    expect(onConfirm).toHaveBeenCalledWith({
      "Who will use the tool?": "Individuals",
      "Where will it run?": "Web",
    });
  });

  it("keeps duplicate option labels as independent radio choices", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ClarifyingQuestions
        questions={[
          {
            question: "Which approach?",
            options: [
              { label: "Either", description: "Use the first approach." },
              { label: "Either", description: "Use the second approach." },
            ],
          },
        ]}
        onConfirm={onConfirm}
        onSkip={vi.fn()}
      />
    );

    const duplicateOptions = screen.getAllByRole("radio", { name: /Either/ });
    await user.click(duplicateOptions[1]);

    expect(duplicateOptions[0]).not.toBeChecked();
    expect(duplicateOptions[1]).toBeChecked();
    expect(screen.getAllByRole("radio", { checked: true })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Generate brief" }));
    expect(onConfirm).toHaveBeenCalledWith({ "Which approach?": "Either" });
  });

  it("tracks questions with duplicate text independently in the UI", async () => {
    const user = userEvent.setup();
    render(
      <ClarifyingQuestions
        questions={[
          {
            question: "Which audience?",
            options: [
              { label: "Teams", description: "The first audience." },
              { label: "Individuals", description: "The second audience." },
            ],
          },
          {
            question: "Which audience?",
            options: [
              { label: "Internal", description: "People in the organization." },
              { label: "External", description: "People outside the organization." },
            ],
          },
        ]}
        onConfirm={vi.fn()}
        onSkip={vi.fn()}
      />
    );

    await user.click(screen.getByRole("radio", { name: /Teams/ }));

    expect(screen.getByRole("radio", { name: /Teams/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Internal/ })).not.toBeChecked();
    expect(screen.getByText("1 / 2 answered")).toBeVisible();
    expect(screen.getByRole("button", { name: "Generate brief" })).toBeDisabled();
  });

  it("preserves regenerate, add, and skip actions", async () => {
    const onRegenerate = vi.fn();
    const onAddQuestion = vi.fn();
    const onSkip = vi.fn();
    const user = userEvent.setup();
    render(
      <ClarifyingQuestions
        questions={questions}
        onConfirm={vi.fn()}
        onSkip={onSkip}
        onRegenerate={onRegenerate}
        onAddQuestion={onAddQuestion}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Generate a new question for question 1" })
    );
    await user.click(screen.getByRole("button", { name: "Add question" }));
    await user.click(screen.getByRole("button", { name: "Skip questions" }));

    expect(onRegenerate).toHaveBeenCalledWith(0);
    expect(onAddQuestion).toHaveBeenCalledOnce();
    expect(onSkip).toHaveBeenCalledOnce();
  });
});
