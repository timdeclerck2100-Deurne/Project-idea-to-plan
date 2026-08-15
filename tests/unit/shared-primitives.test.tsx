import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

describe("shared UI primitives", () => {
  it("renders labeled editable controls at the text and target floors", () => {
    render(
      <form>
        <Label htmlFor="name">Name</Label>
        <Input id="name" />
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" />
      </form>
    );

    expect(screen.getByLabelText("Name")).toHaveClass("h-11", "text-base");
    expect(screen.getByLabelText("Notes")).toHaveClass(
      "min-h-[80px]",
      "text-base",
      "resize-y"
    );
    expect(screen.getByText("Name")).toHaveClass("text-sm");
  });

  it.each(["default", "secondary", "destructive", "outline", "accent"] as const)(
    "keeps the %s badge variant readable",
    (variant) => {
      render(<Badge variant={variant}>{variant}</Badge>);

      expect(screen.getByText(variant)).toHaveClass("text-sm", "tracking-wide");
      expect(screen.getByText(variant)).not.toHaveClass(
        "text-xs",
        "tracking-widest"
      );
    }
  );

  it("defaults Card to the paper variant while preserving class overrides", () => {
    render(
      <Card className="rounded-none">
        <CardTitle>Plan</CardTitle>
        <CardDescription>Implementation details</CardDescription>
      </Card>
    );

    const card = screen.getByText("Plan").parentElement;
    expect(card).toHaveClass("paper-card", "rounded-none");
    expect(card).not.toHaveClass("rounded-2xl");
    expect(screen.getByText("Plan")).toHaveClass("leading-tight");
    expect(screen.getByText("Implementation details")).toHaveClass(
      "leading-relaxed"
    );
  });

  it.each([
    ["paper" as const, "paper-card"],
    ["glass" as const, "glass-panel"],
    ["technical" as const, "blueprint-surface"],
    ["plain" as const, null],
  ])("applies only the %s Card surface recipe", (variant, recipe) => {
    render(<Card variant={variant}>{variant}</Card>);

    const card = screen.getByText(variant);
    const recipes = ["paper-card", "glass-panel", "blueprint-surface"];
    if (recipe) expect(card).toHaveClass(recipe);
    for (const otherRecipe of recipes.filter((candidate) => candidate !== recipe)) {
      expect(card).not.toHaveClass(otherRecipe);
    }
  });
});
