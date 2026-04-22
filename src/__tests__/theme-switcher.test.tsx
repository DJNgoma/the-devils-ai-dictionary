// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeSwitcher } from "@/components/theme-switcher";

function renderWithThemeProvider(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      addListener: () => {},
      dispatchEvent: () => false,
      removeEventListener: () => {},
      removeListener: () => {},
    }),
  });
});

describe("ThemeSwitcher", () => {
  it("renders the detailed settings controls by default", () => {
    renderWithThemeProvider(<ThemeSwitcher />);

    expect(screen.getByText("Book in light mode. Night after dark.")).toBeTruthy();
    expect(screen.getByText("Current")).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: "Choose a theme" })).toBeNull();
  });

  it("renders a compact header control when requested", () => {
    renderWithThemeProvider(<ThemeSwitcher variant="compact" />);

    expect(
      screen.getByRole("checkbox", {
        name: "Automatically match the site theme to light or dark mode",
      }),
    ).toBeTruthy();
    expect(screen.queryByText("Book in light mode. Night after dark.")).toBeNull();
    expect(screen.queryByText("Current")).toBeNull();
    expect(
      (screen.getByRole("combobox", {
        name: "Choose a theme",
      }) as HTMLSelectElement).value,
    ).toBe("book");
  });
});
