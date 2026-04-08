import { describe, expect, it } from "vitest";
import {
  categoryMap,
  difficultyLabels,
  getCategoryBySlug,
  technicalDepthLabels,
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
      "night",
    ]);
  });

  it("keeps the public labels stable", () => {
    expect(difficultyLabels.beginner).toBe("Beginner");
    expect(difficultyLabels.intermediate).toBe("Intermediate");
    expect(difficultyLabels.advanced).toBe("Advanced");
    expect(technicalDepthLabels.low).toBe("Light");
    expect(technicalDepthLabels.medium).toBe("Practical");
    expect(technicalDepthLabels.high).toBe("Deep");
  });
});
