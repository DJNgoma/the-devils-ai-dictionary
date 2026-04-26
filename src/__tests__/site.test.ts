import { describe, expect, it } from "vitest";
import {
  categoryMap,
  difficultyLabels,
  getCategoryBySlug,
  getMobileBackHref,
  getMobileChromeTitle,
  getMobilePrimaryNavId,
  isMobilePrimaryNavActive,
  mobileSecondaryNavigation,
  navigation,
  resolveAutoTheme,
  technicalDepthLabels,
  themeOptionsByAppearance,
  themeOptions,
} from "@/lib/site";

describe("site helpers", () => {
  it("looks up categories by generated slug", () => {
    const category = categoryMap[0];

    expect(getCategoryBySlug(category.slug)).toMatchObject({
      title: category.title,
      slug: category.slug,
    });
    expect(getCategoryBySlug("not-a-real-category")).toBeUndefined();
  });

  it("exposes the expected theme choices", () => {
    expect(themeOptions.map((option) => option.value)).toEqual([
      "book",
      "codex",
      "absolutely",
      "devil",
      "night",
    ]);
    expect(themeOptionsByAppearance.light.map((option) => option.value)).toEqual([
      "book",
      "codex",
      "absolutely",
    ]);
    expect(themeOptionsByAppearance.dark.map((option) => option.value)).toEqual([
      "devil",
      "night",
    ]);
  });

  it("resolves auto appearance to the editorial defaults", () => {
    expect(resolveAutoTheme(false)).toBe("book");
    expect(resolveAutoTheme(true)).toBe("night");
  });

  it("keeps the public labels stable", () => {
    expect(difficultyLabels.beginner).toBe("Beginner");
    expect(difficultyLabels.intermediate).toBe("Intermediate");
    expect(difficultyLabels.advanced).toBe("Advanced");
    expect(technicalDepthLabels.low).toBe("Light");
    expect(technicalDepthLabels.medium).toBe("Practical");
    expect(technicalDepthLabels.high).toBe("Deep");
  });

  it("links the recently added updates surface from site navigation", () => {
    expect(navigation).toContainEqual({ href: "/updates", label: "Updates" });
    expect(mobileSecondaryNavigation).toContainEqual({
      href: "/updates",
      label: "Updates",
    });
    expect(getMobileChromeTitle("/updates")).toBe("Updates");
  });
});

describe("getMobilePrimaryNavId", () => {
  it("maps the dictionary index and detail pages to the search tab", () => {
    expect(getMobilePrimaryNavId("/dictionary")).toBe("search");
    expect(getMobilePrimaryNavId("/dictionary/agent")).toBe("search");
  });

  it("maps the categories index and detail pages to the categories tab", () => {
    expect(getMobilePrimaryNavId("/categories")).toBe("categories");
    expect(getMobilePrimaryNavId("/categories/core-concepts")).toBe(
      "categories",
    );
  });

  it("maps the saved index and any nested saved page to the saved tab", () => {
    expect(getMobilePrimaryNavId("/saved")).toBe("saved");
    expect(getMobilePrimaryNavId("/saved/exports")).toBe("saved");
  });

  it("falls back to home for the root and any unmapped surface", () => {
    expect(getMobilePrimaryNavId("/")).toBe("home");
    expect(getMobilePrimaryNavId("/about")).toBe("home");
    expect(getMobilePrimaryNavId("/random")).toBe("home");
  });

  it("does not treat path prefixes that only share a stem as a match", () => {
    expect(getMobilePrimaryNavId("/dictionary-of-things")).toBe("home");
    expect(getMobilePrimaryNavId("/categories-archive")).toBe("home");
  });
});

describe("isMobilePrimaryNavActive", () => {
  it("returns true when the resolved tab matches the supplied id", () => {
    expect(isMobilePrimaryNavActive("/dictionary/agent", "search")).toBe(true);
    expect(isMobilePrimaryNavActive("/", "home")).toBe(true);
  });

  it("returns false when the tab does not match", () => {
    expect(isMobilePrimaryNavActive("/dictionary/agent", "home")).toBe(false);
    expect(isMobilePrimaryNavActive("/saved", "categories")).toBe(false);
  });
});

describe("getMobileChromeTitle", () => {
  it("titles each known surface with its mobile chrome label", () => {
    expect(getMobileChromeTitle("/saved")).toBe("Saved");
    expect(getMobileChromeTitle("/dictionary")).toBe("Search");
    expect(getMobileChromeTitle("/dictionary/agent")).toBe("Entry");
    expect(getMobileChromeTitle("/categories")).toBe("Categories");
    expect(getMobileChromeTitle("/categories/core-concepts")).toBe("Category");
    expect(getMobileChromeTitle("/book")).toBe("Book");
    expect(getMobileChromeTitle("/how-to-read")).toBe("Guide");
    expect(getMobileChromeTitle("/about")).toBe("About");
    expect(getMobileChromeTitle("/privacy")).toBe("Privacy");
    expect(getMobileChromeTitle("/settings")).toBe("Settings");
    expect(getMobileChromeTitle("/random")).toBe("Random");
  });

  it("falls back to the full site name on unknown surfaces", () => {
    expect(getMobileChromeTitle("/")).toBe("The Devil's AI Dictionary");
    expect(getMobileChromeTitle("/something-new")).toBe(
      "The Devil's AI Dictionary",
    );
  });
});

describe("getMobileBackHref", () => {
  it("points dictionary and category detail pages back to their index", () => {
    expect(getMobileBackHref("/dictionary/agent")).toBe("/dictionary");
    expect(getMobileBackHref("/categories/core-concepts")).toBe("/categories");
  });

  it("returns null on index pages and other surfaces with no parent", () => {
    expect(getMobileBackHref("/dictionary")).toBeNull();
    expect(getMobileBackHref("/categories")).toBeNull();
    expect(getMobileBackHref("/")).toBeNull();
    expect(getMobileBackHref("/saved")).toBeNull();
  });
});

describe("categoryMap", () => {
  it("exposes a slugified version of each category title", () => {
    for (const category of categoryMap) {
      expect(category.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(getCategoryBySlug(category.slug)?.title).toBe(category.title);
    }
  });
});
