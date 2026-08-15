import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GenerationStatus } from "@/components/planner/generation-status";

describe("GenerationStatus", () => {
  it("does not duplicate completion after generation finishes", () => {
    const { container } = render(
      <GenerationStatus status="done" progress="" section="done" />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("places Retry beside an error and invokes the supplied stage retry", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(
      <GenerationStatus
        status="error"
        progress=""
        error="Provider unavailable"
        onRetry={onRetry}
      />
    );

    const alert = screen.getByRole("alert");
    const retry = screen.getByRole("button", { name: "Retry" });
    expect(alert.parentElement).toContainElement(retry);
    await user.click(retry);
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
