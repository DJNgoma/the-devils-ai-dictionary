import { describe, expect, it } from "vitest";
import type { Entry } from "@/lib/content";
import { getWeeklyDigest } from "@/lib/newsletter";

function makeEntry(slug: string, publishedAt: string): Entry {
  return {
    title: slug,
    slug,
    letter: "A",
    categories: ["Test"],
    aliases: [],
    devilDefinition: `${slug} devil definition`,
    plainDefinition: `${slug} plain definition`,
    whyExists: "Because jargon is persistent.",
    misuse: "Usually in a deck.",
    practicalMeaning: "Something practical.",
    example: "An example sentence.",
    askNext: [],
    related: [],
    seeAlso: [],
    difficulty: "beginner",
    technicalDepth: "low",
    hypeLevel: "low",
    isVendorTerm: false,
    publishedAt,
    updatedAt: publishedAt,
    vendorReferences: [],
    tags: [],
    misunderstoodScore: 0,
    translations: [],
    body: "",
    categorySlugs: ["test"],
    url: `/dictionary/${slug}`,
    searchText: slug,
    relatedSlugs: [],
  };
}

describe("weekly digest selection", () => {
  it("uses the previous Tuesday as the inclusive window start", () => {
    const digest = getWeeklyDigest(
      [
        makeEntry("march-17-b", "2026-03-17"),
        makeEntry("march-17-a", "2026-03-17"),
        makeEntry("march-16", "2026-03-16"),
        makeEntry("march-10", "2026-03-10"),
        makeEntry("march-09", "2026-03-09"),
      ],
      "Africa/Johannesburg",
      new Date("2026-03-17T07:00:00Z"),
    );

    expect(digest.startDate).toBe("2026-03-10");
    expect(digest.endDate).toBe("2026-03-17");
    expect(digest.entries.map((entry) => entry.slug)).toEqual([
      "march-16",
      "march-10",
    ]);
  });

  it("breaks ties by slug so the preview stays deterministic", () => {
    const digest = getWeeklyDigest(
      [
        makeEntry("beta", "2026-03-24"),
        makeEntry("alpha", "2026-03-24"),
      ],
      "Africa/Johannesburg",
      new Date("2026-03-25T10:00:00Z"),
    );

    expect(digest.entries.map((entry) => entry.slug)).toEqual(["alpha", "beta"]);
  });
});
