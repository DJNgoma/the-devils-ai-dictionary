"use client";

import { useSyncExternalStore } from "react";
import { useSiteTheme } from "@/components/theme-provider";
import {
  themeAppearanceLabels,
  themeOptions,
  themeOptionsByAppearance,
} from "@/lib/site";

export function ThemeSwitcher() {
  const { mode, resolvedTheme, setMode, setTheme, theme } = useSiteTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const effectiveTheme =
    themeOptions.find((option) => option.value === (mounted ? resolvedTheme : "book")) ??
    themeOptions[0];

  return (
    <div className="space-y-4">
      <label className="flex min-h-[var(--control-height)] items-start justify-between gap-4 rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3">
        <span className="space-y-1">
          <span className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-foreground-soft">
            Auto
          </span>
          <span className="block text-sm leading-7 text-foreground">
            Book in light mode. Night after dark.
          </span>
          <span className="block text-xs leading-6 text-foreground-soft">
            Turn it off if you want one of the more opinionated editions.
          </span>
        </span>
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-accent"
          checked={mode === "auto"}
          onChange={(event) => setMode(event.target.checked ? "auto" : "manual")}
        />
      </label>

      {mode === "auto" ? (
        <div className="rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3">
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-foreground-soft">
            Current
          </p>
          <div className="mt-2 flex items-center gap-3">
            <ThemeSwatches colors={effectiveTheme.swatches} />
            <div>
              <p className="text-sm font-medium text-foreground">{effectiveTheme.label}</p>
              <p className="text-xs leading-6 text-foreground-soft">
                Auto is following this device&apos;s current light or dark setting.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {(["light", "dark"] as const).map((appearance) => (
            <div key={appearance} className="space-y-2">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-foreground-soft">
                {themeAppearanceLabels[appearance]}
              </p>
              <div className="space-y-2">
                {themeOptionsByAppearance[appearance].map((option) => {
                  const selected = option.value === theme;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTheme(option.value)}
                      className="flex w-full items-center gap-3 rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-left text-sm text-foreground hover:border-accent/40 hover:bg-surface-strong"
                    >
                      <ThemeSwatches colors={option.swatches} />
                      <span className="flex-1">{option.label}</span>
                      <span className="text-xs uppercase tracking-[0.18em] text-foreground-soft">
                        {selected ? "Selected" : appearance}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ThemeSwatches({ colors }: { colors: readonly string[] }) {
  return (
    <span className="flex items-center gap-1.5" aria-hidden="true">
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
