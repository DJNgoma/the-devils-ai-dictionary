// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DirectoryExplorer } from "@/components/directory-explorer";
import { MobileShellController } from "@/components/mobile-shell-controller";
import { ThemeProvider } from "@/components/theme-provider";
import {
  normalizeDirectoryExplorerState,
  resolveLetterForDirectoryQuery,
} from "@/lib/directory-explorer-state";
import type { SearchableEntry } from "@/lib/content";

let currentPathname = "/search";
let currentSearch = "";

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const categories = [
  { title: "Core concepts", slug: "core-concepts" },
  { title: "Product and vendor terms", slug: "product-and-vendor-terms" },
];

const entries: SearchableEntry[] = [
  {
    aliases: ["software agent"],
    categories: ["Core concepts"],
    categorySlugs: ["core-concepts"],
    devilDefinition: "A machine with just enough initiative to be introduced twice.",
    difficulty: "beginner",
    hypeLevel: "medium",
    isVendorTerm: false,
    letter: "A",
    plainDefinition: "A system that can act on instructions.",
    slug: "agent",
    technicalDepth: "low",
    title: "Agent",
    warningLabel: undefined,
  },
  {
    aliases: ["microsoft assistant"],
    categories: ["Product and vendor terms"],
    categorySlugs: ["product-and-vendor-terms"],
    devilDefinition: "A product label with more surfaces than patience.",
    difficulty: "beginner",
    hypeLevel: "high",
    isVendorTerm: true,
    letter: "C",
    plainDefinition: "Microsoft's AI product brand.",
    slug: "microsoft-copilot",
    technicalDepth: "low",
    title: "Microsoft Copilot",
    warningLabel: undefined,
  },
];

function makeEntry(index: number): SearchableEntry {
  return {
    aliases: [],
    categories: ["Core concepts"],
    categorySlugs: ["core-concepts"],
    devilDefinition: `Definition for generated term ${index}.`,
    difficulty: "beginner",
    hypeLevel: "medium",
    isVendorTerm: false,
    letter: "A",
    plainDefinition: `Plain definition for generated term ${index}.`,
    slug: `generated-term-${index}`,
    technicalDepth: "low",
    title: `Generated Term ${index}`,
    warningLabel: undefined,
  };
}

function renderExplorer(
  props: Partial<React.ComponentProps<typeof DirectoryExplorer>> = {},
) {
  const mergedProps: React.ComponentProps<typeof DirectoryExplorer> = {
    entries,
    categories,
    initialQuery: "",
    initialCategory: "all",
    initialDifficulty: "all",
    initialVendor: "all",
    initialDepth: "all",
    initialLetter: "all",
    ...props,
  };

  return render(
    <ThemeProvider>
      <MobileShellController>
        <DirectoryExplorer {...mergedProps} />
      </MobileShellController>
    </ThemeProvider>,
  );
}

function syncBrowserLocation(hash = "") {
  const search = currentSearch ? `?${currentSearch}` : "";
  window.history.replaceState(
    null,
    "",
    `${currentPathname}${search}${hash}`,
  );
}

describe("normalizeDirectoryExplorerState", () => {
  it("drops multi-value params and invalid filters back to defaults", () => {
    expect(
      normalizeDirectoryExplorerState(
        {
          q: ["agent", "copilot"],
          category: "core-concepts",
          difficulty: "wizard",
          vendor: "bad",
          depth: "void",
          letter: "m",
        },
        {
          categorySlugs: categories.map((category) => category.slug),
        },
      ),
    ).toEqual({
      query: "",
      category: "core-concepts",
      difficulty: "all",
      vendor: "all",
      depth: "all",
      letter: "M",
    });
  });

  it("drops the letter filter once a query is present", () => {
    expect(resolveLetterForDirectoryQuery("A", "agent")).toBe("all");
    expect(resolveLetterForDirectoryQuery("A", "   ")).toBe("A");
  });
});

describe("DirectoryExplorer URL state", () => {
  beforeEach(() => {
    currentPathname = "/search";
    currentSearch = "";
    syncBrowserLocation();
  });

  it("renders a deep-linked initial state and canonicalizes it to the hash", async () => {
    currentSearch = "q=agent&category=core-concepts";
    syncBrowserLocation();
    const initialState = normalizeDirectoryExplorerState(
      new URLSearchParams(currentSearch),
      {
        categorySlugs: categories.map((category) => category.slug),
      },
    );

    renderExplorer({
      initialCategory: initialState.category,
      initialDepth: initialState.depth,
      initialDifficulty: initialState.difficulty,
      initialQuery: initialState.query,
      initialVendor: initialState.vendor,
    });

    await waitFor(() => {
      const searchInputs = screen.getAllByRole("searchbox");
      expect((searchInputs[0] as HTMLInputElement).value).toBe("agent");
    });

    const categorySelects = screen.getAllByRole("combobox");
    expect((categorySelects[0] as HTMLSelectElement).value).toBe("core-concepts");
    expect(window.location.pathname).toBe("/search");
    expect(window.location.search).toBe("");
    expect(window.location.hash).toBe("#q=agent&category=core-concepts");
  });

  it("states the full dictionary size and filtered total", async () => {
    renderExplorer();

    expect(screen.getByText("2 words in the dictionary.")).toBeDefined();

    currentSearch = "q=agent";
    syncBrowserLocation();
    renderExplorer({ initialQuery: "agent" });

    await waitFor(() => {
      expect(
        screen.getByText("1 entry matches your search out of 2 words."),
      ).toBeDefined();
    });
  });

  it("renders the unfiltered dictionary in batches", () => {
    const manyEntries = Array.from({ length: 80 }, (_, index) =>
      makeEntry(index + 1),
    );

    renderExplorer({ entries: manyEntries });

    expect(screen.getByText("80 words in the dictionary.")).toBeDefined();
    expect(screen.getByText(/Showing 72 of 80 entries/)).toBeDefined();
    expect(screen.getByText("Generated Term 72")).toBeDefined();
    expect(screen.queryByText("Generated Term 73")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Show more" }));

    expect(screen.getByText("Generated Term 73")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Show more" })).toBeNull();
  });

  it("applies query params without server-provided initial state", async () => {
    currentPathname = "/dictionary";
    currentSearch = "q=agent";
    syncBrowserLocation();

    renderExplorer();

    await waitFor(() => {
      expect((screen.getAllByRole("searchbox")[0] as HTMLInputElement).value).toBe("agent");
      expect(
        screen.getByText("1 entry matches your search out of 2 words."),
      ).toBeDefined();
    });

    expect(window.location.search).toBe("");
    expect(window.location.hash).toBe("#q=agent");
  });

  it("normalizes invalid dictionary params back to the canonical URL once", async () => {
    currentPathname = "/dictionary";
    currentSearch =
      "q=agent&category=not-real&difficulty=wizard&vendor=bad&depth=void&letter=ZZ";
    syncBrowserLocation();
    const initialState = normalizeDirectoryExplorerState(
      new URLSearchParams(currentSearch),
      {
        categorySlugs: categories.map((category) => category.slug),
        },
    );

    renderExplorer({
      initialCategory: initialState.category,
      initialDepth: initialState.depth,
      initialDifficulty: initialState.difficulty,
      initialLetter: initialState.letter,
      initialQuery: initialState.query,
      initialVendor: initialState.vendor,
    });

    await waitFor(() => {
      expect(window.location.pathname).toBe("/dictionary");
      expect(window.location.search).toBe("");
      expect(window.location.hash).toBe("#q=agent");
    });
  });

  it("reconciles state when browser history updates the URL", async () => {
    currentSearch = "q=agent";
    syncBrowserLocation();
    const initialState = normalizeDirectoryExplorerState(
      new URLSearchParams(currentSearch),
      {
        categorySlugs: categories.map((category) => category.slug),
      },
    );

    renderExplorer({
      initialCategory: initialState.category,
      initialDepth: initialState.depth,
      initialDifficulty: initialState.difficulty,
      initialQuery: initialState.query,
      initialVendor: initialState.vendor,
    });

    await waitFor(() => {
      expect((screen.getAllByRole("searchbox")[0] as HTMLInputElement).value).toBe("agent");
    });

    window.history.pushState(null, "", "/search#q=copilot");
    window.dispatchEvent(new HashChangeEvent("hashchange"));

    await waitFor(() =>
      expect((screen.getAllByRole("searchbox")[0] as HTMLInputElement).value).toBe("copilot"),
    );
  });

  it("uses the hash as the canonical in-page search state", async () => {
    currentSearch = "";
    syncBrowserLocation("#q=agent&category=core-concepts");
    const initialState = normalizeDirectoryExplorerState(
      new URLSearchParams("q=agent&category=core-concepts"),
      {
        categorySlugs: categories.map((category) => category.slug),
      },
    );

    renderExplorer({
      initialCategory: initialState.category,
      initialDepth: initialState.depth,
      initialDifficulty: initialState.difficulty,
      initialQuery: initialState.query,
      initialVendor: initialState.vendor,
    });

    await waitFor(() => {
      expect((screen.getAllByRole("searchbox")[0] as HTMLInputElement).value).toBe("agent");
    });

    expect(window.location.pathname).toBe("/search");
    expect(window.location.search).toBe("");
    expect(window.location.hash).toBe("#q=agent&category=core-concepts");
  });

});
