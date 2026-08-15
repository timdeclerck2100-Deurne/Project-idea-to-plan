"use client";

import * as React from "react";
import { themes, THEME_STORAGE_KEY, getThemeById, buildThemeStyleString, type Theme } from "@/lib/themes";

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

function subscribeTheme(callback: () => void) {
  const handler = () => callback();
  window.addEventListener("theme-changed", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("theme-changed", handler);
    window.removeEventListener("storage", handler);
  };
}

function getThemeSnapshot() {
  return getThemeById(localStorage.getItem(THEME_STORAGE_KEY) || themes[0].id).id;
}

function getThemeServerSnapshot() {
  return themes[0].id;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeId = React.useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);
  const theme = React.useMemo(() => getThemeById(themeId), [themeId]);

  const setTheme = React.useCallback((id: string) => {
    localStorage.setItem(THEME_STORAGE_KEY, getThemeById(id).id);
    window.dispatchEvent(new Event("theme-changed"));
  }, []);

  React.useEffect(() => {
    let styleEl = document.getElementById("theme-styles");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "theme-styles";
      document.head.appendChild(styleEl);
    }
    document.documentElement.dataset.theme = theme.id;
    styleEl.textContent = buildThemeStyleString(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
