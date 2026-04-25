import { describe, expect, it } from "vitest";
import {
  categoryMap,
  difficultyLabels,
  getMobileChromeTitle,
  getCategoryBySlug,
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
