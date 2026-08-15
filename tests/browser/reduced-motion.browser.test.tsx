import { afterEach, beforeEach, expect, test } from "vitest";
import { cdp } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import "@/app/globals.css";

beforeEach(async () => {
  await cdp().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
});

afterEach(async () => {
  await cleanup();
  await cdp().send("Emulation.setEmulatedMedia", { features: [] });
});

test("removes decorative and drag motion without erasing functional graph transforms", async () => {
  const screen = await render(
    <main>
      <span data-testid="spinner" className="animate-spin">Loading…</span>
      <span data-testid="pulse" className="animate-pulse">Working…</span>
      <div data-testid="entry" className="animate-fade-up">Ready</div>
      <div data-testid="dragging" className="roadmap-dragging">Dragging</div>
      <div className="planner-flow">
        <div
          data-testid="viewport"
          className="react-flow__viewport"
          style={{ transform: "translate(24px, 16px) scale(1)", transition: "transform 2s" }}
        />
      </div>
    </main>,
  );

  expect(matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);

  for (const testId of ["spinner", "pulse", "entry"]) {
    expect(getComputedStyle(screen.getByTestId(testId).element()).animationName).toBe("none");
  }

  const dragging = screen.getByTestId("dragging").element();
  expect(getComputedStyle(dragging).transform).toBe("none");
  expect(getComputedStyle(dragging).opacity).toBe("0.4");

  const viewport = screen.getByTestId("viewport").element();
  expect(getComputedStyle(viewport).transitionProperty).toBe("none");
  expect(getComputedStyle(viewport).transform).not.toBe("none");
});
