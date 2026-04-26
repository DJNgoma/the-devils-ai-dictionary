// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  it("renders the detailed settings controls by default", async () => {
    const user = userEvent.setup();

    renderWithThemeProvider(<ThemeSwitcher />);

    expect(
      screen.getByRole("button", { name: /Auto appearance/, pressed: true }),
    ).toBeTruthy();
    expect(screen.getByText("Book in light mode. Night after dark.")).toBeTruthy();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Appearance" })).toBeNull();

    await user.click(screen.getByRole("button", { name: /Codex/ }));

    expect(screen.getByRole("button", { name: /Codex/, pressed: true })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Auto appearance/, pressed: false }),
    ).toBeTruthy();
  });

  it("renders a compact header control when requested", async () => {
    const user = userEvent.setup();

    renderWithThemeProvider(<ThemeSwitcher variant="compact" />);

    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByText("Book in light mode. Night after dark.")).toBeNull();
    const select = screen.getByRole("combobox", {
      name: "Appearance",
    }) as HTMLSelectElement;

    expect(select.value).toBe("auto");

    await user.selectOptions(select, "devil");

    expect(select.value).toBe("devil");

    await user.selectOptions(select, "auto");

    expect(select.value).toBe("auto");
  });
});
