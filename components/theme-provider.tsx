"use client";

import * as React from "react";
import { themes, THEME_STORAGE_KEY, getThemeById, type Theme } from "@/lib/themes";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (id: string) => void;
}

const ThemeContext = React.createContext<ThemeContextValue>({
  theme: themes[0],
  setTheme: () => {},
});

export function useTheme() {
  return React.useContext(ThemeContext);
}

function buildStyleString(theme: Theme): string {
  const c = theme.colors;
  const u = theme.utilities;
  const f = theme.fonts;
  return `
:root {
  --background: ${c.background};
  --foreground: ${c.foreground};
  --card: ${c.card};
  --card-foreground: ${c.cardForeground};
  --primary: ${c.primary};
  --primary-foreground: ${c.primaryForeground};
  --secondary: ${c.secondary};
  --secondary-foreground: ${c.secondaryForeground};
  --muted: ${c.muted};
  --muted-foreground: ${c.mutedForeground};
  --accent: ${c.accent};
  --accent-foreground: ${c.accentForeground};
  --destructive: ${c.destructive};
  --destructive-foreground: ${c.destructiveForeground};
  --border: ${c.border};
  --ring: ${c.ring};
  --input: ${c.input};
  --chart-1: ${c.chart1};
  --chart-2: ${c.chart2};
  --chart-3: ${c.chart3};
  --chart-4: ${c.chart4};
  --chart-5: ${c.chart5};
  --font-body: ${f.body};
  --font-display-family: ${f.display};
  --font-code: ${f.code};
  --ut-planner-gradient: ${u.plannerBgGradient};
  --ut-planner-grid: ${u.plannerBgGrid};
  --ut-planner-radial1: ${u.plannerBgRadial1};
  --ut-planner-radial2: ${u.plannerBgRadial2};
  --ut-glass-bg: ${u.glassPanelBg};
  --ut-glass-border: ${u.glassPanelBorder};
  --ut-glass-shadow: ${u.glassPanelShadow};
  --ut-glass-inset: ${u.glassPanelInset};
  --ut-paper-bg: ${u.paperCardBg};
  --ut-paper-border: ${u.paperCardBorder};
  --ut-paper-shadow: ${u.paperCardShadow};
  --ut-paper-inset: ${u.paperCardInset};
  --ut-bp-grid: ${u.blueprintGrid};
  --ut-bp-bg: ${u.blueprintBg};
  --ut-bp-border: ${u.blueprintBorder};
  --ut-cmd-from: ${u.commandStripFrom};
  --ut-cmd-via: ${u.commandStripVia};
  --ut-cmd-to: ${u.commandStripTo};
  --ut-cmd-text: ${u.commandStripText};
  --ut-micro-color: ${u.microLabelColor};
}`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = React.useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(THEME_STORAGE_KEY) || themes[0].id;
    }
    return themes[0].id;
  });

  const theme = React.useMemo(() => getThemeById(themeId), [themeId]);

  const setTheme = React.useCallback((id: string) => {
    setThemeId(id);
    localStorage.setItem(THEME_STORAGE_KEY, id);
  }, []);

  React.useEffect(() => {
    let styleEl = document.getElementById("theme-styles");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "theme-styles";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = buildStyleString(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
