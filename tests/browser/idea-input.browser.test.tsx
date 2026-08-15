import * as React from "react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { IdeaInput } from "@/components/planner/idea-input";

function ControlledIdeaInput() {
  const [value, setValue] = React.useState("");
  return <IdeaInput value={value} onChange={setValue} />;
}

test("accepts an idea and has no detectable accessibility violations", async () => {
  const screen = await render(<ControlledIdeaInput />);
  const input = screen.getByRole("textbox", { name: "App Idea" });

  await expect.element(input).toHaveAttribute("id", "idea");
  await expect.element(input).toHaveAttribute("name", "idea");
  await expect.element(input).toHaveAttribute("autocomplete", "off");
  await expect.element(input).toHaveAttribute("placeholder", "Describe your app idea…");

  await input.fill("A neighborhood tool library");
  await expect.element(input).toHaveValue("A neighborhood tool library");

  const results = await axe.run(screen.container, {
    rules: { region: { enabled: false } },
  });
  const violations = results.violations.map(({ id, help }) => `${id}: ${help}`);
  expect(results.violations, violations.join("\n")).toEqual([]);
});
