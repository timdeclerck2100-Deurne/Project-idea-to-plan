import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppNameEditor } from "@/components/planner/app-name-editor";

function renderEditor(overrides: Partial<React.ComponentProps<typeof AppNameEditor>> = {}) {
  return render(
    <AppNameEditor
      name="Fieldnote"
      onCommitName={vi.fn()}
      onGenerateName={vi.fn()}
      generatedSuggestion="Research Atlas"
      onUseGeneratedName={vi.fn()}
      onDismissGeneratedName={vi.fn()}
      {...overrides}
    />
  );
}

describe("AppNameEditor", () => {
  it("restores focus to the name input after using a generated name", () => {
    const onUseGeneratedName = vi.fn();
    renderEditor({ onUseGeneratedName });

    fireEvent.click(screen.getByRole("button", { name: "Use name" }));

    expect(onUseGeneratedName).toHaveBeenCalledWith("Research Atlas");
    expect(screen.getByRole("textbox", { name: "App name" })).toHaveFocus();
  });

  it("restores focus to Generate name after dismissing a suggestion", () => {
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(screen.getByRole("button", { name: "Generate name" })).toHaveFocus();
  });

  it("uses unique input IDs for reusable instances", () => {
    render(
      <>
        <AppNameEditor
          name="First"
          onCommitName={vi.fn()}
          onUseGeneratedName={vi.fn()}
          onDismissGeneratedName={vi.fn()}
        />
        <AppNameEditor
          name="Second"
          onCommitName={vi.fn()}
          onUseGeneratedName={vi.fn()}
          onDismissGeneratedName={vi.fn()}
        />
      </>
    );

    const inputs = screen.getAllByRole("textbox", { name: "App name" });
    expect(inputs[0].id).toBeTruthy();
    expect(inputs[0].id).not.toBe(inputs[1].id);
  });
});
