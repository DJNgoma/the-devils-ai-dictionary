"use client";

import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const label = resolvedTheme ? (isDark ? "Light" : "Dark") : "Theme";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "inline-flex items-center rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium tracking-[0.16em] text-foreground-soft uppercase",
        "hover:border-accent hover:text-foreground",
      )}
      aria-label="Toggle dark mode"
    >
      {label}
    </button>
  );
}
