import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InlineCardAssistant } from "@/components/planner/inline-card-assistant";

describe("InlineCardAssistant", () => {
  it("uses unique panel IDs for reusable instances", () => {
    render(
      <>
        <InlineCardAssistant sectionId="appSummary" onAsk={vi.fn()} />
        <InlineCardAssistant sectionId="appSummary" onAsk={vi.fn()} />
      </>
    );

    const triggers = screen.getAllByRole("button", { name: "Ask AI" });
    expect(triggers[0].getAttribute("aria-controls")).toBeTruthy();
    expect(triggers[0]).not.toHaveAttribute(
      "aria-controls",
      triggers[1].getAttribute("aria-controls")
    );
  });

  it("closes and restores trigger focus after applying a suggestion", () => {
    const onApplySuggestion = vi.fn();
    render(
      <InlineCardAssistant
        sectionId="appSummary"
        state={{ isLoading: false, answer: "Use a clearer summary.", canApply: true }}
        onAsk={vi.fn()}
        onApplySuggestion={onApplySuggestion}
      />
    );

    const trigger = screen.getByRole("button", { name: "Ask AI" });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Use suggestion" }));

    expect(onApplySuggestion).toHaveBeenCalledOnce();
    expect(screen.queryByText("Use a clearer summary.")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes and restores trigger focus after dismissing", () => {
    render(
      <InlineCardAssistant
        sectionId="appSummary"
        state={{ isLoading: false, answer: "Use a clearer summary." }}
        onAsk={vi.fn()}
        onDismiss={vi.fn()}
      />
    );

    const trigger = screen.getByRole("button", { name: "Ask AI" });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
