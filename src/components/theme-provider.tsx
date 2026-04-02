"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { themeOptions, type ThemeName } from "@/lib/site";

const STORAGE_KEY = "site-theme";
const FALLBACK_THEME: ThemeName = "book";
const themeValues = new Set<ThemeName>(themeOptions.map((option) => option.value));

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeName(value: string | null): value is ThemeName {
  return Boolean(value && themeValues.has(value as ThemeName));
}

function readStoredTheme(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredTheme(theme: ThemeName) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures and keep the in-memory theme state.
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window === "undefined") {
      return FALLBACK_THEME;
    }

    const documentTheme = document.documentElement.getAttribute("data-theme");

    if (isThemeName(documentTheme)) {
      return documentTheme;
    }

    const storedTheme = readStoredTheme();
    return isThemeName(storedTheme) ? storedTheme : FALLBACK_THEME;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    writeStoredTheme(theme);
  }, [theme]);

  const setTheme = useCallback((nextTheme: ThemeName) => {
    setThemeState(nextTheme);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
    }),
    [theme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useSiteTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useSiteTheme must be used inside ThemeProvider.");
  }

  return context;
}
