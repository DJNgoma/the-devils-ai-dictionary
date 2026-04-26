"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { useSiteTheme } from "@/components/theme-provider";
import {
  themeAppearanceLabels,
  themeOptions,
  themeOptionsByAppearance,
  type ThemeName,
} from "@/lib/site";

type ThemeSwitcherProps = {
  variant?: "compact" | "full";
  className?: string;
};

export function ThemeSwitcher({
  variant = "full",
  className,
}: ThemeSwitcherProps) {
  const { mode, resolvedTheme, setMode, setTheme, theme } = useSiteTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const displayedTheme = mounted
    ? (mode === "auto" ? resolvedTheme : theme)
    : "book";
  const effectiveTheme =
    themeOptions.find((option) => option.value === displayedTheme) ??
    themeOptions[0];
  const selectedChoice = mode === "auto" ? "auto" : theme;

  function chooseTheme(value: string) {
    if (value === "auto") {
      setMode("auto");
      return;
    }

    setMode("manual");
    setTheme(value as ThemeName);
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex flex-wrap items-center justify-end gap-2", className)}>
        <label className="theme-choice min-w-[15.5rem]">
          <ThemeSwatches colors={effectiveTheme.swatches} className="theme-preview" />
          <span className="sr-only">Appearance</span>
          <select
            aria-label="Appearance"
            value={selectedChoice}
            onChange={(event) => chooseTheme(event.target.value)}
          >
            <option value="auto">Auto: Book / Night</option>
            {themeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <button
        type="button"
        onClick={() => setMode("auto")}
        aria-pressed={mode === "auto"}
        className={cn(
          "flex w-full flex-col gap-3 rounded-[var(--radius-control)] border px-4 py-3 text-left transition hover:border-accent/40 hover:bg-surface-strong sm:flex-row sm:items-center sm:gap-4",
          mode === "auto"
            ? "border-accent/60 bg-accent-soft"
            : "border-line bg-surface",
        )}
      >
        <span className="min-w-0 flex-1 space-y-1">
          <span className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-foreground-soft">
            Auto appearance
          </span>
          <span className="block text-sm leading-7 text-foreground">
            Book in light mode. Night after dark.
          </span>
          <span className="block text-xs leading-6 text-foreground-soft">
            Follows this device until you choose a manual edition.
          </span>
        </span>
        <span className="flex w-full shrink-0 items-center justify-between gap-3 text-left sm:w-auto sm:flex-col sm:items-end sm:gap-2 sm:text-right">
          <ThemeSwatches colors={effectiveTheme.swatches} />
          <span className="text-xs uppercase tracking-[0.18em] text-foreground-soft">
            {mode === "auto" ? `Using ${effectiveTheme.label}` : "Use auto"}
          </span>
        </span>
      </button>

      <div className="space-y-4">
        {(["light", "dark"] as const).map((appearance) => (
          <div key={appearance} className="space-y-2">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-foreground-soft">
              {themeAppearanceLabels[appearance]}
            </p>
            <div className="space-y-2">
              {themeOptionsByAppearance[appearance].map((option) => {
                const selected = mode === "manual" && option.value === theme;
                const autoCurrent = mode === "auto" && option.value === displayedTheme;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => chooseTheme(option.value)}
                    aria-pressed={selected}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[var(--radius-control)] border px-4 py-3 text-left text-sm transition hover:border-accent/40 hover:bg-surface-strong",
                      selected
                        ? "border-accent/60 bg-surface-strong text-foreground"
                        : "border-line bg-surface text-foreground",
                    )}
                  >
                    <ThemeSwatches colors={option.swatches} />
                    <span className="flex-1">{option.label}</span>
                    <span className="text-xs uppercase tracking-[0.18em] text-foreground-soft">
                      {selected ? "Selected" : autoCurrent ? "Auto current" : "Choose"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThemeSwatches({
  colors,
  className,
}: {
  colors: readonly string[];
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-1.5", className)} aria-hidden="true">
      {colors.map((color) => (
        <span
          key={color}
          className="h-3 w-3 rounded-full border border-black"
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  );
}
