import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("handles a user click", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={onClick}>Generate</Button>);
    await user.click(screen.getByRole("button", { name: "Generate" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it.each([
    [undefined, "h-11", "text-sm"],
    ["sm" as const, "h-10", "text-sm"],
    ["lg" as const, "h-12", "text-base"],
    ["icon" as const, "size-11", "text-sm"],
  ])("keeps the %s size above its target and text floors", (size, height, text) => {
    render(<Button size={size}>Action</Button>);

    expect(screen.getByRole("button", { name: "Action" })).toHaveClass(
      height,
      text
    );
  });

  it("preserves semantic rendering with asChild", () => {
    render(
      <Button asChild>
        <a href="/plans">View plans</a>
      </Button>
    );

    expect(screen.getByRole("link", { name: "View plans" })).toHaveAttribute(
      "href",
      "/plans"
    );
  });
});
