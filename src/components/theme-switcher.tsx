"use client";

import { useSyncExternalStore } from "react";
import { useSiteTheme } from "@/components/theme-provider";
import { themeOptions } from "@/lib/site";

export function ThemeSwitcher() {
  const { theme, setTheme } = useSiteTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const activeTheme =
    themeOptions.find((option) => option.value === theme) ?? themeOptions[0];
  const displayTheme = mounted ? activeTheme : themeOptions[0];

  return (
    <label className="theme-choice">
      <span className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-foreground-soft">
        Theme
      </span>
      <div className="theme-preview" aria-hidden="true">
        <span style={{ backgroundColor: displayTheme.swatches[0] }} />
        <span style={{ backgroundColor: displayTheme.swatches[1] }} />
        <span style={{ backgroundColor: displayTheme.swatches[2] }} />
      </div>
      <select
        aria-label="Choose site theme"
        value={displayTheme.value}
        onChange={(event) => setTheme(event.target.value as (typeof themeOptions)[number]["value"])}
      >
        {themeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
