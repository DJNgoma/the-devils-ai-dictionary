"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  resolveAutoTheme,
  themeOptions,
  type ThemeMode,
  type ThemeName,
} from "@/lib/site";

const THEME_STORAGE_KEY = "site-theme";
const MODE_STORAGE_KEY = "site-theme-mode";
const FALLBACK_THEME: ThemeName = "book";
const themeValues = new Set<ThemeName>(themeOptions.map((option) => option.value));

type ThemeContextValue = {
  theme: ThemeName;
  mode: ThemeMode;
  resolvedTheme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeName(value: string | null): value is ThemeName {
  return Boolean(value && themeValues.has(value as ThemeName));
}

function readStoredTheme(): string | null {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredTheme(theme: ThemeName) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures and keep the in-memory theme state.
  }
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "auto" || value === "manual";
}

function readStoredThemeMode(): string | null {
  try {
    return window.localStorage.getItem(MODE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredThemeMode(mode: ThemeMode) {
  try {
    window.localStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore storage failures and keep the in-memory theme state.
  }
}

function canUseMatchMedia() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window === "undefined") {
      return FALLBACK_THEME;
    }

    const storedTheme = readStoredTheme();
    return isThemeName(storedTheme) ? storedTheme : FALLBACK_THEME;
  });
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "auto";
    }

    const storedMode = readStoredThemeMode();
    if (isThemeMode(storedMode)) {
      return storedMode;
    }

    return isThemeName(readStoredTheme()) ? "manual" : "auto";
  });
  const [prefersDark, setPrefersDark] = useState(() => {
    if (!canUseMatchMedia()) {
      return false;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const resolvedTheme = mode === "auto" ? resolveAutoTheme(prefersDark) : theme;

  useEffect(() => {
    if (!canUseMatchMedia()) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (event: MediaQueryListEvent) => {
      setPrefersDark(event.matches);
    };

    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
    document.documentElement.setAttribute("data-theme-mode", mode);
    writeStoredTheme(theme);
    writeStoredThemeMode(mode);
  }, [mode, resolvedTheme, theme]);

  const setTheme = useCallback((nextTheme: ThemeName) => {
    setThemeState(nextTheme);
  }, []);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      mode,
      resolvedTheme,
      setTheme,
      setMode,
    }),
    [mode, resolvedTheme, setMode, setTheme, theme],
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
