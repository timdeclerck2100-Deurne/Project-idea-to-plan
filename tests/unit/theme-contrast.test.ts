import { describe, expect, it } from "vitest";
import { themes } from "@/lib/themes";

type Color = { r: number; g: number; b: number; a: number };
type Oklab = { l: number; a: number; b: number; alpha: number };

function parseNumber(value: string, scale = 1) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid color channel: ${value}`);
  return value.endsWith("%") ? parsed / 100 : parsed / scale;
}

function parseOklchChroma(value: string) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid chroma: ${value}`);
  return value.endsWith("%") ? (parsed / 100) * 0.4 : parsed;
}

function parseAlpha(value: string | undefined) {
  return value === undefined ? 1 : parseNumber(value);
}

function hueToDegrees(value: string) {
  const hue = Number.parseFloat(value);
  if (!Number.isFinite(hue)) throw new Error(`Invalid hue: ${value}`);
  if (value.endsWith("turn")) return hue * 360;
  if (value.endsWith("grad")) return hue * 0.9;
  if (value.endsWith("rad")) return hue * (180 / Math.PI);
  return hue;
}

function oklabToColor({ l, a, b, alpha }: Oklab): Color {
  const lRoot = l + 0.3963377774 * a + 0.2158037573 * b;
  const mRoot = l - 0.1055613458 * a - 0.0638541728 * b;
  const sRoot = l - 0.0894841775 * a - 1.291485548 * b;
  const ll = lRoot ** 3;
  const mm = mRoot ** 3;
  const ss = sRoot ** 3;

  return {
    r: linearToSrgb(Math.min(1, Math.max(0, 4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss))),
    g: linearToSrgb(Math.min(1, Math.max(0, -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss))),
    b: linearToSrgb(Math.min(1, Math.max(0, -0.0041960863 * ll - 0.7034186147 * mm + 1.707614701 * ss))),
    a: alpha,
  };
}

function srgbToLinear(value: number) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(value: number) {
  return value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
}

function parseOklab(value: string): Oklab {
  const match = value.trim().match(/^oklch\(\s*([^\s/]+)\s+([^\s/]+)\s+([^\s/]+)(?:\s*\/\s*([^\s)]+))?\s*\)$/i);
  if (!match) throw new Error(`Unsupported OKLCH color: ${value}`);
  const l = parseNumber(match[1]);
  const chroma = parseOklchChroma(match[2]);
  const hue = (hueToDegrees(match[3]) * Math.PI) / 180;
  return { l, a: chroma * Math.cos(hue), b: chroma * Math.sin(hue), alpha: parseAlpha(match[4]) };
}

function parseColor(value: string): Color {
  const color = value.trim();
  if (/^oklch\(/i.test(color)) return oklabToColor(parseOklab(color));

  const hex = color.match(/^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i)?.[1];
  if (hex) {
    const expanded = hex.length <= 4 ? [...hex].map((channel) => channel + channel).join("") : hex;
    return {
      r: Number.parseInt(expanded.slice(0, 2), 16) / 255,
      g: Number.parseInt(expanded.slice(2, 4), 16) / 255,
      b: Number.parseInt(expanded.slice(4, 6), 16) / 255,
      a: expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1,
    };
  }

  const rgb = color.match(/^rgba?\(\s*([\d.]+%?)[,\s]+([\d.]+%?)[,\s]+([\d.]+%?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i);
  if (rgb) {
    const channel = (part: string) => part.endsWith("%") ? parseNumber(part) : parseNumber(part, 255);
    return { r: channel(rgb[1]), g: channel(rgb[2]), b: channel(rgb[3]), a: parseAlpha(rgb[4]) };
  }

  throw new Error(`Unsupported color: ${value}`);
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

function contrast(foreground: string | Color, background: string | Color, canvas?: string | Color) {
  let fg = typeof foreground === "string" ? parseColor(foreground) : foreground;
  let bg = typeof background === "string" ? parseColor(background) : background;
  if (canvas) {
    const base = typeof canvas === "string" ? parseColor(canvas) : canvas;
    bg = composite(bg, base);
  }
  fg = composite(fg, bg);
  const lighter = Math.max(luminance(fg), luminance(bg));
  const darker = Math.min(luminance(fg), luminance(bg));
  return (lighter + 0.05) / (darker + 0.05);
}

function interpolateOklab(from: string, to: string, amount: number) {
  const start = parseOklab(from);
  const end = parseOklab(to);
  return oklabToColor({
    l: start.l + (end.l - start.l) * amount,
    a: start.a + (end.a - start.a) * amount,
    b: start.b + (end.b - start.b) * amount,
    alpha: start.alpha + (end.alpha - start.alpha) * amount,
  });
}

function expectContrast(themeId: string, pair: string, ratio: number, minimum: number) {
  expect.soft(ratio, `${themeId} ${pair}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(minimum);
}

describe("theme contrast", () => {
  it("parses supported CSS colors and alpha deterministically", () => {
    expect(contrast("#000", "rgb(255 255 255)")).toBeCloseTo(21, 5);
    expect(contrast("#777", "#fff")).toBeCloseTo(4.48, 2);
    expect(contrast("rgb(0 0 0 / 50%)", "#fff")).toBeCloseTo(3.98, 1);
    expect(parseOklab("oklch(50% 100% 0)").a).toBeCloseTo(0.4, 5);
    expect(() => parseColor("not-a-color")).toThrow(/Unsupported color/);
  });

  it.each(themes)("meets text contrast throughout $name", (theme) => {
    const c = theme.colors;
    const u = theme.utilities;
    const textPairs = [
      ["foreground/background", c.foreground, c.background, undefined],
      ["card foreground/card", c.cardForeground, c.card, c.background],
      ["primary foreground/primary", c.primaryForeground, c.primary, undefined],
      ["secondary foreground/secondary", c.secondaryForeground, c.secondary, c.background],
      ["muted foreground/muted", c.mutedForeground, c.muted, c.background],
      ["accent foreground/accent", c.accentForeground, c.accent, undefined],
      ["destructive foreground/destructive", c.destructiveForeground, c.destructive, undefined],
      ["primary text/background", c.primary, c.background, undefined],
      ["accent text/background", c.accent, c.background, undefined],
      ["destructive text/background", c.destructive, c.background, undefined],
      ["muted text/background", c.mutedForeground, c.background, undefined],
      ["primary text/card", c.primary, c.card, c.background],
      ["accent text/card", c.accent, c.card, c.background],
      ["destructive text/card", c.destructive, c.card, c.background],
      ["micro label/background", u.microLabelColor, c.background, undefined],
    ] as const;

    for (const [name, foreground, background, canvas] of textPairs) {
      expectContrast(theme.id, name, contrast(foreground, background, canvas), 4.5);
    }
  });

  it.each(themes)("keeps focus and control boundaries visible in $name", (theme) => {
    const { background, border, card, input, ring } = theme.colors;
    expectContrast(theme.id, "focus ring/background", contrast(ring, background), 3);
    expectContrast(theme.id, "focus ring/card", contrast(ring, card, background), 3);
    expectContrast(theme.id, "subtle border/background", contrast(border, background, background), 1.5);
    expectContrast(theme.id, "subtle input/background", contrast(input, background, background), 1.5);
  });

  it.each(themes)("keeps hover fills readable in $name", (theme) => {
    const c = theme.colors;
    const cardSurface = composite(parseColor(c.card), parseColor(c.background));
    const destructiveHover = { ...parseColor(c.destructive), a: 0.9 };
    const secondaryHover = { ...parseColor(c.secondary), a: 0.8 };
    expectContrast(
      theme.id,
      "destructive hover/card",
      contrast(c.destructiveForeground, destructiveHover, cardSurface),
      4.5,
    );
    expectContrast(
      theme.id,
      "secondary hover/card",
      contrast(c.secondaryForeground, secondaryHover, cardSurface),
      4.5,
    );
  });

  it.each(themes)("keeps command-strip text legible across the $name gradient", (theme) => {
    const { commandStripFrom, commandStripVia, commandStripTo, commandStripText } = theme.utilities;
    const stops = [commandStripFrom, commandStripVia, commandStripTo];
    for (let segment = 0; segment < stops.length - 1; segment += 1) {
      for (let sample = 0; sample <= 10; sample += 1) {
        const color = interpolateOklab(stops[segment], stops[segment + 1], sample / 10);
        expectContrast(theme.id, `command gradient ${segment}:${sample}`, contrast(commandStripText, color), 4.5);
      }
    }
  });
});
