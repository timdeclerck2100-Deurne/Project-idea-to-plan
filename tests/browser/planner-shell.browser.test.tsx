import axe from "axe-core";
import { expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import Home from "@/app/page";
import "@/app/globals.css";

const widths = [320, 390, 768, 1024, 1440] as const;

test.each(widths)("keeps the idle shell responsive at %ipx", async (width) => {
  await page.viewport(width, 700);
  const screen = await render(<Home />);

  await expect.element(screen.getByRole("main")).toBeVisible();
  await expect.element(screen.getByRole("heading", { level: 1 })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Generate" })).toBeVisible();
  await expect.element(screen.getByRole("textbox", { name: "App Idea" })).toBeVisible();

  const ideaField = screen.getByRole("textbox", { name: "App Idea" }).element();
  const generateButton = screen.getByRole("button", { name: "Generate" }).element();
  expect(Number.parseFloat(getComputedStyle(ideaField).fontSize)).toBeGreaterThanOrEqual(16);
  expect(Number.parseFloat(getComputedStyle(generateButton).fontSize)).toBeGreaterThanOrEqual(14);

  const main = document.querySelector("main");
  const bodyStyle = getComputedStyle(document.body);
  const mainStyle = main ? getComputedStyle(main) : null;
  const layout = {
    h1Count: document.querySelectorAll("h1").length,
    mainCount: document.querySelectorAll("main").length,
    noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth,
    documentOwnsScroll: document.scrollingElement === document.documentElement,
    bodyOverflowY: bodyStyle.overflowY,
    mainOverflowY: mainStyle?.overflowY,
    mainMinHeight: mainStyle?.minHeight,
  };

  expect(layout).toMatchObject({
    h1Count: 1,
    mainCount: 1,
    noHorizontalOverflow: true,
    documentOwnsScroll: true,
    bodyOverflowY: "visible",
    mainOverflowY: "visible",
    mainMinHeight: "700px",
  });

  if (width === 320) {
    const skipLink = screen.getByRole("link", { name: "Skip to project workflow" });
    await userEvent.tab();
    await expect.element(skipLink).toHaveFocus();
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(skipLink.element().getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
    const focusStyle = getComputedStyle(skipLink.element());
    expect(Number.parseFloat(focusStyle.outlineWidth) > 0 || focusStyle.boxShadow !== "none").toBe(true);

    const results = await axe.run(screen.container);
    const violations = results.violations.map(({ id, help }) => `${id}: ${help}`);
    expect(results.violations, violations.join("\n")).toEqual([]);
  }
});
