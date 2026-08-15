import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import RootLayout from "@/app/layout";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import {
  THEME_STORAGE_KEY,
  buildThemeStyleString,
  getThemeById,
  themes,
} from "@/lib/themes";

vi.mock("next/font/google", () => ({
  Fraunces: () => ({ variable: "--font-fraunces" }),
  IBM_Plex_Mono: () => ({ variable: "--font-ibm-plex-mono" }),
  IBM_Plex_Sans: () => ({ variable: "--font-ibm-plex-sans" }),
}));

vi.mock("next/script", () => ({
  default: ({ strategy, ...props }: ComponentProps<"script"> & { strategy?: string }) => {
    void strategy;
    return <script {...props} />;
  },
}));

const expectedThemes = [
  ["default", "Blueprint"],
  ["ocean-depths", "Ocean Depths"],
  ["sunset-boulevard", "Sunset Boulevard"],
  ["forest-canopy", "Forest Canopy"],
  ["modern-minimalist", "Modern Minimalist"],
  ["golden-hour", "Golden Hour"],
  ["arctic-frost", "Arctic Frost"],
  ["desert-rose", "Desert Rose"],
  ["tech-innovation", "Tech Innovation"],
  ["botanical-garden", "Botanical Garden"],
  ["midnight-galaxy", "Midnight Galaxy"],
] as const;

const colorVariables = {
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  cardForeground: "--card-foreground",
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  secondary: "--secondary",
  secondaryForeground: "--secondary-foreground",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  destructive: "--destructive",
  destructiveForeground: "--destructive-foreground",
  border: "--border",
  ring: "--ring",
  input: "--input",
  chart1: "--chart-1",
  chart2: "--chart-2",
  chart3: "--chart-3",
  chart4: "--chart-4",
  chart5: "--chart-5",
} as const;

const fontVariables = {
  body: "--font-body",
  display: "--font-display-family",
  code: "--font-code",
} as const;

const utilityVariables = {
  plannerBgGradient: "--ut-planner-gradient",
  plannerBgGrid: "--ut-planner-grid",
  plannerBgRadial1: "--ut-planner-radial1",
  plannerBgRadial2: "--ut-planner-radial2",
  glassPanelBg: "--ut-glass-bg",
  glassPanelBorder: "--ut-glass-border",
  glassPanelShadow: "--ut-glass-shadow",
  glassPanelInset: "--ut-glass-inset",
  paperCardBg: "--ut-paper-bg",
  paperCardBorder: "--ut-paper-border",
  paperCardShadow: "--ut-paper-shadow",
  paperCardInset: "--ut-paper-inset",
  blueprintGrid: "--ut-bp-grid",
  blueprintBg: "--ut-bp-bg",
  blueprintBorder: "--ut-bp-border",
  commandStripFrom: "--ut-cmd-from",
  commandStripVia: "--ut-cmd-via",
  commandStripTo: "--ut-cmd-to",
  commandStripText: "--ut-cmd-text",
  microLabelColor: "--ut-micro-color",
} as const;

const storedValues = new Map<string, string>();
const localStorageMock: Storage = {
  get length() {
    return storedValues.size;
  },
  clear() {
    storedValues.clear();
  },
  getItem(key) {
    return storedValues.get(key) ?? null;
  },
  key(index) {
    return [...storedValues.keys()][index] ?? null;
  },
  removeItem(key) {
    storedValues.delete(key);
  },
  setItem(key, value) {
    storedValues.set(key, String(value));
  },
};

function ThemeConsumer() {
  const { theme, setTheme } = useTheme();

  return (
    <>
      <output aria-label="current theme">{theme.id}</output>
      <button type="button" onClick={() => setTheme("ocean-depths")}>
        Use Ocean Depths
      </button>
    </>
  );
}

describe("theme definitions", () => {
  it("exposes exactly the expected 11 IDs and names", () => {
    expect(themes.map(({ id, name }) => [id, name])).toEqual(expectedThemes);
  });

  it("uses Blueprint for the default and unknown IDs", () => {
    expect(getThemeById("default")).toBe(themes[0]);
    expect(getThemeById("not-a-theme")).toBe(themes[0]);
  });

  it("uses the same typography role stacks for every theme", () => {
    const expectedFonts = {
      body: "var(--font-ibm-plex-sans), system-ui, sans-serif",
      display: "var(--font-fraunces), Georgia, serif",
      code: "var(--font-ibm-plex-mono), ui-monospace, monospace",
    };

    expect(themes.map(({ fonts }) => fonts)).toEqual(
      themes.map(() => expectedFonts),
    );
  });

  it("builds complete semantic, font, and utility CSS for every theme", () => {
    for (const theme of themes) {
      const css = buildThemeStyleString(theme);

      expect(css).toMatch(/^\s*:root\s*\{/);
      expect(css).toMatch(/\}\s*$/);
      expect(css).not.toContain("undefined");

      for (const [key, variable] of Object.entries(colorVariables)) {
        expect(css).toContain(
          `${variable}: ${theme.colors[key as keyof typeof theme.colors]};`,
        );
      }
      for (const [key, variable] of Object.entries(fontVariables)) {
        expect(css).toContain(
          `${variable}: ${theme.fonts[key as keyof typeof theme.fonts]};`,
        );
      }
      for (const [key, variable] of Object.entries(utilityVariables)) {
        expect(css).toContain(
          `${variable}: ${theme.utilities[key as keyof typeof theme.utilities]};`,
        );
      }

      expect(css.match(/^\s*--[\w-]+:/gm)).toHaveLength(45);
    }
  });
});

describe("theme bootstrap", () => {
  beforeAll(() => {
    vi.stubGlobal("localStorage", localStorageMock);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    localStorage.clear();
    document.getElementById("theme-styles")?.remove();
    delete document.documentElement.dataset.theme;
  });

  function runThemeInitScript() {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <main />
      </RootLayout>,
    );
    const parsedDocument = new DOMParser().parseFromString(markup, "text/html");
    const script = parsedDocument.getElementById("theme-init")?.textContent;

    expect(parsedDocument.documentElement.getAttribute("data-theme")).toBe("default");
    expect(script).toBeTruthy();
    window.eval(script!);
  }

  it("sets the stored theme on html before hydration", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "golden-hour");

    runThemeInitScript();

    expect(document.documentElement).toHaveAttribute("data-theme", "golden-hour");
    expect(document.getElementById("theme-styles")).toHaveTextContent(
      `--primary: ${getThemeById("golden-hour").colors.primary}`,
    );
  });

  it("normalizes an unknown stored theme to default before hydration", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "unknown-theme");

    runThemeInitScript();

    expect(document.documentElement).toHaveAttribute("data-theme", "default");
    expect(document.getElementById("theme-styles")).toHaveTextContent(
      `--background: ${themes[0].colors.background}`,
    );
  });
});

describe("ThemeProvider persistence", () => {
  beforeAll(() => {
    vi.stubGlobal("localStorage", localStorageMock);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    localStorage.clear();
    document.getElementById("theme-styles")?.remove();
    delete document.documentElement.dataset.theme;
  });

  it("defaults to Blueprint and applies its CSS to the document", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByLabelText("current theme")).toHaveTextContent("default");
    expect(document.getElementById("theme-styles")).toHaveTextContent(
      `--primary: ${themes[0].colors.primary}`,
    );
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(document.documentElement).toHaveAttribute("data-theme", "default");
  });

  it("loads a persisted theme from planner-theme", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "golden-hour");

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    const goldenHour = getThemeById("golden-hour");
    expect(THEME_STORAGE_KEY).toBe("planner-theme");
    expect(screen.getByLabelText("current theme")).toHaveTextContent("golden-hour");
    expect(document.getElementById("theme-styles")).toHaveTextContent(
      `--primary: ${goldenHour.colors.primary}`,
    );
    expect(document.documentElement).toHaveAttribute("data-theme", "golden-hour");
  });

  it("persists and applies a theme selected through the provider", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Use Ocean Depths" }));

    const oceanDepths = getThemeById("ocean-depths");
    expect(localStorage.getItem("planner-theme")).toBe("ocean-depths");
    expect(screen.getByLabelText("current theme")).toHaveTextContent("ocean-depths");
    expect(document.getElementById("theme-styles")).toHaveTextContent(
      `--background: ${oceanDepths.colors.background}`,
    );
    expect(document.documentElement).toHaveAttribute("data-theme", "ocean-depths");
  });

  it("responds to storage events by reading and applying the latest theme", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    localStorage.setItem(THEME_STORAGE_KEY, "midnight-galaxy");
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: THEME_STORAGE_KEY,
          newValue: "midnight-galaxy",
        }),
      );
    });

    const midnightGalaxy = getThemeById("midnight-galaxy");
    expect(screen.getByLabelText("current theme")).toHaveTextContent("midnight-galaxy");
    expect(document.getElementById("theme-styles")).toHaveTextContent(
      `--accent: ${midnightGalaxy.colors.accent}`,
    );
    expect(document.documentElement).toHaveAttribute("data-theme", "midnight-galaxy");
  });

  it("falls back to Blueprint when the persisted ID is unknown", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "unknown-theme");

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByLabelText("current theme")).toHaveTextContent("default");
    expect(document.getElementById("theme-styles")).toHaveTextContent(
      `--background: ${themes[0].colors.background}`,
    );
    expect(document.documentElement).toHaveAttribute("data-theme", "default");
  });
});
