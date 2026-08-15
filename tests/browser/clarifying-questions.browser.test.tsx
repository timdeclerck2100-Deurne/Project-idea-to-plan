import axe from "axe-core";
import { expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ClarifyingQuestions } from "@/components/planner/clarifying-questions";

const questions = [
  {
    question: "Who is the primary audience for this project?",
    options: [
      {
        label: "Solo founders",
        description: "People validating and launching an idea independently.",
      },
      {
        label: "Small product teams",
        description: "Cross-functional teams planning work together.",
      },
    ],
  },
  {
    question: "What should the first release prioritize?",
    options: [
      {
        label: "Fast validation",
        description: "Test the core assumption with the smallest useful release.",
      },
      {
        label: "Operational depth",
        description: "Support a complete day-to-day workflow from launch.",
      },
    ],
  },
];

test("supports an accessible keyboard workflow for clarifying questions", async () => {
  const onConfirm = vi.fn();
  const screen = await render(
    <ClarifyingQuestions
      questions={questions}
      onConfirm={onConfirm}
      onSkip={vi.fn()}
    />,
  );

  const results = await axe.run(screen.container);
  const violations = results.violations.map(({ id, help }) => `${id}: ${help}`);
  expect(results.violations, violations.join("\n")).toEqual([]);

  const audienceGroup = screen.getByRole("group", {
    name: /Who is the primary audience for this project\?/,
  });
  const priorityGroup = screen.getByRole("group", {
    name: /What should the first release prioritize\?/,
  });
  const soloFounders = audienceGroup.getByRole("radio", { name: /Solo founders/ });
  const smallTeams = audienceGroup.getByRole("radio", { name: /Small product teams/ });
  const fastValidation = priorityGroup.getByRole("radio", { name: /Fast validation/ });
  const operationalDepth = priorityGroup.getByRole("radio", { name: /Operational depth/ });

  await expect
    .element(soloFounders)
    .toHaveAccessibleDescription("People validating and launching an idea independently.");
  await expect
    .element(smallTeams)
    .toHaveAccessibleDescription("Cross-functional teams planning work together.");
  await expect
    .element(fastValidation)
    .toHaveAccessibleDescription("Test the core assumption with the smallest useful release.");
  await expect
    .element(operationalDepth)
    .toHaveAccessibleDescription("Support a complete day-to-day workflow from launch.");

  await userEvent.tab();
  await expect.element(soloFounders).toHaveFocus();
  await userEvent.keyboard("{ArrowRight}");
  await expect.element(smallTeams).toBeChecked();
  await expect.element(screen.getByText("1 / 2 answered")).toBeVisible();

  await userEvent.tab();
  await expect.element(fastValidation).toHaveFocus();
  await userEvent.keyboard("{ArrowRight}");
  await expect.element(operationalDepth).toBeChecked();
  await expect.element(screen.getByText("2 / 2 answered")).toBeVisible();

  await userEvent.tab();
  await expect
    .element(screen.getByRole("button", { name: "Skip questions" }))
    .toHaveFocus();
  await userEvent.tab();
  const generateBrief = screen.getByRole("button", { name: "Generate brief" });
  await expect.element(generateBrief).toHaveFocus();
  await userEvent.keyboard("{Enter}");

  expect(onConfirm).toHaveBeenCalledOnce();
  expect(onConfirm).toHaveBeenCalledWith({
    "Who is the primary audience for this project?": "Small product teams",
    "What should the first release prioritize?": "Operational depth",
  });
});
