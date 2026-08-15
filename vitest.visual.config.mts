import { webdriverio } from "@vitest/browser-webdriverio";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["tests/visual/**/*.visual.test.{ts,tsx}"],
    setupFiles: ["./tests/setup.browser.ts"],
    browser: {
      enabled: true,
      headless: true,
      viewport: { width: 800, height: 600 },
      provider: webdriverio({
        capabilities: {
          browserName: "chrome",
          "wdio:chromedriverOptions": {
            binary: "/usr/bin/chromedriver",
          },
          "goog:chromeOptions": {
            binary: "/usr/bin/chromium",
            args: ["--no-sandbox", "--disable-dev-shm-usage"],
          },
        },
      }),
      instances: [{ browser: "chrome" }],
    },
  },
});
