import { expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildThemeStyleString, getThemeById, THEME_STORAGE_KEY, themes } from "@/lib/themes";
import "@/app/globals.css";

function ThemeInteractionMatrix() {
  const { theme, setTheme } = useTheme();

  return (
    <main>
      <output aria-label="Applied theme">{theme.id}</output>
      <nav aria-label="Test themes">
        {themes.map(({ id, name }) => (
          <button key={id} type="button" onClick={() => setTheme(id)}>
            {name}
          </button>
        ))}
      </nav>
      <Button data-testid="primary" style={{ transition: "none" }}>Primary action</Button>
      <Button data-testid="secondary" variant="secondary" style={{ transition: "none" }}>Secondary action</Button>
      <Button data-testid="destructive" variant="destructive" style={{ transition: "none" }}>Delete plan</Button>
      <Button data-testid="disabled" disabled style={{ transition: "none" }}>Disabled action</Button>
      <Button data-testid="loading" disabled aria-busy="true" style={{ transition: "none" }}>Loading…</Button>
      <Badge data-testid="success" variant="accent" style={{ transition: "none" }}>Success</Badge>
      <Badge data-testid="error" variant="destructive" style={{ transition: "none" }}>Error</Badge>
      <span data-testid="command-text-probe" style={{ color: "var(--ut-cmd-text)" }} />
      <span
        data-testid="destructive-probe"
        style={{ backgroundColor: "var(--destructive)", color: "var(--destructive-foreground)" }}
      />
      <span
        data-testid="success-probe"
        style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}
      />
      <span className="planner-flow" data-testid="flow-attribution-probe">
        <span className="react-flow__attribution">
          <a href="https://reactflow.dev" target="_blank" rel="noreferrer">React Flow</a>
        </span>
      </span>
    </main>
  );
}

type Color = { r: number; g: number; b: number; a: number };

const expectedThemeIds = [
  "default",
  "ocean-depths",
  "sunset-boulevard",
  "forest-canopy",
  "modern-minimalist",
  "golden-hour",
  "arctic-frost",
  "desert-rose",
  "tech-innovation",
  "botanical-garden",
  "midnight-galaxy",
];

function srgbToLinear(value: number) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(value: number) {
  return value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
}

function hueToDegrees(value: string) {
  const hue = Number.parseFloat(value);
  if (value.endsWith("turn")) return hue * 360;
  if (value.endsWith("grad")) return hue * 0.9;
  if (value.endsWith("rad")) return hue * (180 / Math.PI);
  return hue;
}

function oklchToColor(value: string): Color {
  const match = value.trim().match(/^oklch\(\s*([^\s/]+)\s+([^\s/]+)\s+([^\s/]+)(?:\s*\/\s*([^\s)]+))?\s*\)$/i);
  if (!match) throw new Error(`Unsupported OKLCH color: ${value}`);
  const l = match[1].endsWith("%") ? Number.parseFloat(match[1]) / 100 : Number.parseFloat(match[1]);
  const chroma = match[2].endsWith("%") ? (Number.parseFloat(match[2]) / 100) * 0.4 : Number.parseFloat(match[2]);
  const hue = (hueToDegrees(match[3]) * Math.PI) / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const lRoot = l + 0.3963377774 * a + 0.2158037573 * b;
  const mRoot = l - 0.1055613458 * a - 0.0638541728 * b;
  const sRoot = l - 0.0894841775 * a - 1.291485548 * b;
  const ll = lRoot ** 3;
  const mm = mRoot ** 3;
  const ss = sRoot ** 3;
  const alpha = match[4]?.endsWith("%") ? Number.parseFloat(match[4]) / 100 : Number.parseFloat(match[4] ?? "1");
  return {
    r: linearToSrgb(Math.min(1, Math.max(0, 4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss))),
    g: linearToSrgb(Math.min(1, Math.max(0, -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss))),
    b: linearToSrgb(Math.min(1, Math.max(0, -0.0041960863 * ll - 0.7034186147 * mm + 1.707614701 * ss))),
    a: alpha,
  };
}

function parseRenderedColor(value: string): Color {
  const normalized = value.trim();
  if (/^oklch\(/i.test(normalized)) return oklchToColor(normalized);
  const rgb = normalized.match(/^rgba?\(\s*([\d.]+%?)[,\s]+([\d.]+%?)[,\s]+([\d.]+%?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i);
  if (rgb) {
    const channel = (part: string) => part.endsWith("%") ? Number.parseFloat(part) / 100 : Number.parseFloat(part) / 255;
    const alpha = rgb[4]?.endsWith("%") ? Number.parseFloat(rgb[4]) / 100 : Number.parseFloat(rgb[4] ?? "1");
    return { r: channel(rgb[1]), g: channel(rgb[2]), b: channel(rgb[3]), a: alpha };
  }
  const srgb = normalized.match(/^color\(srgb\s+([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+%?)(?:\s*\/\s*([\d.]+%?))?\)$/i);
  if (srgb) {
    const channel = (part: string) => part.endsWith("%") ? Number.parseFloat(part) / 100 : Number.parseFloat(part);
    const alpha = srgb[4]?.endsWith("%") ? Number.parseFloat(srgb[4]) / 100 : Number.parseFloat(srgb[4] ?? "1");
    return { r: channel(srgb[1]), g: channel(srgb[2]), b: channel(srgb[3]), a: alpha };
  }
  throw new Error(`Unsupported rendered color: ${value}`);
}

function composite(foreground: Color, background: Color): Color {
  const alpha = foreground.a + background.a * (1 - foreground.a);
  if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
    g: (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
    b: (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
    a: alpha,
  };
}

function luminance(color: Color) {
  return 0.2126 * srgbToLinear(color.r) + 0.7152 * srgbToLinear(color.g) + 0.0722 * srgbToLinear(color.b);
}

function contrast(foreground: string, background: string) {
  const canvas = parseRenderedColor(getComputedStyle(document.documentElement).backgroundColor || "rgb(0 0 0)");
  const bg = composite(parseRenderedColor(background), canvas);
  const fg = composite(parseRenderedColor(foreground), bg);
  const lighter = Math.max(luminance(fg), luminance(bg));
  const darker = Math.min(luminance(fg), luminance(bg));
  return (lighter + 0.05) / (darker + 0.05);
}

function expectRenderedTextContrast(label: string, element: HTMLElement) {
  const style = getComputedStyle(element);
  expect.soft(contrast(style.color, style.backgroundColor), label).toBeGreaterThanOrEqual(4.5);
}

test.sequential("applies the full interaction-state matrix across all 11 themes", async () => {
  localStorage.clear();
  const screen = await render(
    <ThemeProvider>
      <ThemeInteractionMatrix />
    </ThemeProvider>,
  );
  const element = (testId: string) => screen.container.querySelector<HTMLElement>(`[data-testid="${testId}"]`)!;

  for (const theme of themes) {
    await userEvent.click(screen.getByRole("button", { name: theme.name }));
    await expect.element(screen.getByLabelText("Applied theme")).toHaveTextContent(theme.id);

    expect(document.documentElement.dataset.theme).toBe(theme.id);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(theme.id);
    expect(getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()).toBe(theme.colors.primary);

    const primary = element("primary");
    const secondary = element("secondary");
    const destructive = element("destructive");
    const disabled = element("disabled");
    const loading = element("loading");
    const success = element("success");
    const error = element("error");

    expect(getComputedStyle(primary).backgroundImage).toContain("linear-gradient");
    expect(getComputedStyle(primary).color).toBe(getComputedStyle(element("command-text-probe")).color);
    expect(getComputedStyle(destructive).backgroundColor).toBe(getComputedStyle(element("destructive-probe")).backgroundColor);
    expect(getComputedStyle(destructive).color).toBe(getComputedStyle(element("destructive-probe")).color);
    expectRenderedTextContrast(`${theme.id} destructive`, destructive);
    expectRenderedTextContrast(`${theme.id} secondary`, secondary);
    expectRenderedTextContrast(`${theme.id} success`, success);
    expectRenderedTextContrast(`${theme.id} error`, error);

    primary.focus();
    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(secondary);
    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(destructive);
    expect(destructive.matches(":focus-visible")).toBe(true);
    expect(getComputedStyle(destructive).boxShadow).not.toBe("none");
    await userEvent.hover(destructive);
    expect(destructive.matches(":hover")).toBe(true);
    expect(destructive.className).toContain("hover:bg-destructive/90");
    expectRenderedTextContrast(`${theme.id} destructive hover`, destructive);
    await userEvent.hover(secondary);
    expectRenderedTextContrast(`${theme.id} secondary hover`, secondary);

    expect(disabled).toBeDisabled();
    expect(getComputedStyle(disabled).opacity).toBe("0.5");
    expect(loading).toBeDisabled();
    expect(loading).toHaveAttribute("aria-busy", "true");
    expect(loading).toHaveTextContent("Loading…");

    expect(getComputedStyle(success).backgroundColor).toBe(getComputedStyle(element("success-probe")).backgroundColor);
    expect(getComputedStyle(success).color).toBe(getComputedStyle(element("success-probe")).color);
    expect(getComputedStyle(error).backgroundColor).toBe(getComputedStyle(element("destructive-probe")).backgroundColor);
    expect(getComputedStyle(error).color).toBe(getComputedStyle(element("destructive-probe")).color);

    const attribution = screen.container.querySelector<HTMLAnchorElement>('.react-flow__attribution a')!;
    expect(Number.parseFloat(getComputedStyle(attribution).fontSize)).toBeGreaterThanOrEqual(14);
    expectRenderedTextContrast(`${theme.id} attribution`, attribution);
    attribution.focus();
    expect(getComputedStyle(attribution).outlineStyle).toBe("solid");
  }

  expect(themes.map(({ id }) => id)).toEqual(expectedThemeIds);
  expect(getThemeById("default").id).toBe("default");
  expect(getThemeById("missing-theme").id).toBe("default");
  expect(buildThemeStyleString(themes[0])).toContain("--background:");
  await cleanup();
});
