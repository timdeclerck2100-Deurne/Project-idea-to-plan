import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import Home from "@/app/page";
import "@/app/globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

test.each(viewports)(
  "matches the idle PlannerView/Home shell at $width x $height",
  async ({ name, width, height }) => {
    await page.viewport(width, height);
    localStorage.clear();

    const screen = await render(
      <ThemeProvider>
        <style>{`
          html {
            scrollbar-width: none;
          }
          html::-webkit-scrollbar {
            display: none;
          }
          *, *::before, *::after {
            animation: none !important;
            caret-color: transparent !important;
            transition: none !important;
          }
        `}</style>
        <Home />
      </ThemeProvider>,
    );

    await document.fonts.ready;
    const main = screen.getByRole("main");
    await expect.element(main).toBeVisible();
    await expect.element(main).toMatchScreenshot(`home-idle-${name}`);
  },
);
