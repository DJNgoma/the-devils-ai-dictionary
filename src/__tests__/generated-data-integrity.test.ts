/**
 * Tests that the build-time generated data is structurally correct.
 *
 * These tests exist because the app previously crashed on Cloudflare Workers
 * (Error 1102: Worker exceeded resource limits) when Zod validation,
 * search-text building, related-entry scoring, and stat computation all
 * happened at request time. Moving that work to the build script fixed the
 * issue — but the build output must stay correct.
 *
 * If any of these fail, run `npm run content:build` and try again.
 */

import { describe, expect, it } from "vitest";
import generatedData from "@/generated/entries.generated.json";

const {
  entries,
  recentSlugs,
  misunderstoodSlugs,
  letterStats,
  categoryStats,
  editorialTimeZone,
  dailyWordStartDate,
  dailyWordSlugs,
  featuredSlug,
  latestPublishedAt,
} =
  generatedData;

/* ---------- top-level structure ---------- */

describe("generated data top-level structure", () => {
  it("has all required top-level keys", () => {
    expect(generatedData).toHaveProperty("entries");
    expect(generatedData).toHaveProperty("recentSlugs");
    expect(generatedData).toHaveProperty("misunderstoodSlugs");
    expect(generatedData).toHaveProperty("letterStats");
    expect(generatedData).toHaveProperty("categoryStats");
    expect(generatedData).toHaveProperty("editorialTimeZone");
    expect(generatedData).toHaveProperty("dailyWordStartDate");
    expect(generatedData).toHaveProperty("dailyWordSlugs");
    expect(generatedData).toHaveProperty("featuredSlug");
    expect(generatedData).toHaveProperty("latestPublishedAt");
  });

  it("entries is a non-empty array", () => {
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThan(0);
  });
});

/* ---------- entry shape (pre-computed fields) ---------- */

describe("each entry has pre-computed fields", () => {
  it.each(entries.map((e) => [e.slug, e]))(
    "%s has categorySlugs, url, searchText, relatedSlugs",
    (_slug, entry) => {
      // These fields MUST be pre-computed at build time, NOT at runtime.
      // Missing any of them means the Worker will either crash or need
      // to compute them on the fly, risking Error 1102 again.
      expect(Array.isArray(entry.categorySlugs)).toBe(true);
      expect(entry.categorySlugs.length).toBeGreaterThan(0);
      expect(entry.url).toMatch(/^\/dictionary\//);
      expect(typeof entry.searchText).toBe("string");
      expect(entry.searchText.length).toBeGreaterThan(0);
      expect(Array.isArray(entry.relatedSlugs)).toBe(true);
    },
  );
});

describe("each entry has required frontmatter fields", () => {
  it.each(entries.map((e) => [e.slug, e]))(
    "%s has all required fields",
    (_slug, entry) => {
      expect(typeof entry.title).toBe("string");
      expect(entry.title.length).toBeGreaterThan(0);
      expect(typeof entry.slug).toBe("string");
      expect(typeof entry.letter).toBe("string");
      expect(entry.letter).toMatch(/^[A-Z]$/);
      expect(Array.isArray(entry.categories)).toBe(true);
      expect(entry.categories.length).toBeGreaterThan(0);
      expect(typeof entry.devilDefinition).toBe("string");
      expect(typeof entry.plainDefinition).toBe("string");
      expect(typeof entry.difficulty).toBe("string");
      expect(["beginner", "intermediate", "advanced"]).toContain(entry.difficulty);
      expect(typeof entry.technicalDepth).toBe("string");
      expect(["low", "medium", "high"]).toContain(entry.technicalDepth);
      expect(typeof entry.hypeLevel).toBe("string");
      expect(["low", "medium", "high", "severe"]).toContain(entry.hypeLevel);
      expect(typeof entry.publishedAt).toBe("string");
      expect(typeof entry.updatedAt).toBe("string");
    },
  );
});

/* ---------- no duplicate slugs ---------- */

describe("slug uniqueness", () => {
  it("has no duplicate entry slugs", () => {
    const slugs = entries.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

/* ---------- entries are pre-sorted alphabetically ---------- */

describe("entries are pre-sorted", () => {
  it("entries are in alphabetical order by title", () => {
    for (let i = 1; i < entries.length; i++) {
      const prev = entries[i - 1].title;
      const curr = entries[i].title;
      expect(prev.localeCompare(curr)).toBeLessThanOrEqual(0);
    }
  });
});

/* ---------- derived collections ---------- */

describe("recentSlugs", () => {
  it("is an array of valid slugs", () => {
    const allSlugs = new Set(entries.map((e) => e.slug));
    expect(Array.isArray(recentSlugs)).toBe(true);
    expect(recentSlugs.length).toBeLessThanOrEqual(4);
    for (const slug of recentSlugs) {
      expect(allSlugs.has(slug)).toBe(true);
    }
  });

  it("is sorted by publishedAt descending", () => {
    const entryBySlug = new Map(entries.map((e) => [e.slug, e]));
    for (let i = 1; i < recentSlugs.length; i++) {
      const prev = new Date(entryBySlug.get(recentSlugs[i - 1])!.publishedAt).getTime();
      const curr = new Date(entryBySlug.get(recentSlugs[i])!.publishedAt).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });
});

describe("misunderstoodSlugs", () => {
  it("is an array of valid slugs", () => {
    const allSlugs = new Set(entries.map((e) => e.slug));
    expect(Array.isArray(misunderstoodSlugs)).toBe(true);
    expect(misunderstoodSlugs.length).toBeLessThanOrEqual(4);
    for (const slug of misunderstoodSlugs) {
      expect(allSlugs.has(slug)).toBe(true);
    }
  });
});

describe("featuredSlug", () => {
  it("references an existing entry", () => {
    const allSlugs = new Set(entries.map((e) => e.slug));
    expect(typeof featuredSlug).toBe("string");
    expect(allSlugs.has(featuredSlug)).toBe(true);
  });
});

describe("dailyWord schedule", () => {
  it("pins the editorial timezone", () => {
    expect(editorialTimeZone).toBe("Africa/Johannesburg");
    expect(typeof dailyWordStartDate).toBe("string");
    expect(Array.isArray(dailyWordSlugs)).toBe(true);
  });

  it("contains each entry once in published order before wraparound", () => {
    const expectedSlugs = [...entries]
      .toSorted((left, right) => {
        const publishedOrder = left.publishedAt.localeCompare(right.publishedAt);
        if (publishedOrder !== 0) {
          return publishedOrder;
        }

        return left.slug.localeCompare(right.slug);
      })
      .map((entry) => entry.slug);

    expect(dailyWordSlugs).toEqual(expectedSlugs);
    expect(new Set(dailyWordSlugs).size).toBe(entries.length);
    expect(dailyWordStartDate).toBe(
      [...entries]
        .toSorted((left, right) => left.publishedAt.localeCompare(right.publishedAt))[0]
        ?.publishedAt,
    );
  });
});

describe("latestPublishedAt", () => {
  it("matches the newest publishedAt date in the catalogue", () => {
    const newestPublishedAt = entries.reduce((latest, entry) => {
      if (!latest) {
        return entry.publishedAt;
      }

      return new Date(entry.publishedAt).getTime() > new Date(latest).getTime()
        ? entry.publishedAt
        : latest;
    }, "");

    expect(latestPublishedAt).toBe(newestPublishedAt);
  });
});

/* ---------- letterStats ---------- */

describe("letterStats", () => {
  it("has exactly 26 letters", () => {
    expect(letterStats.length).toBe(26);
  });

  it("covers A-Z with counts and hrefs", () => {
    for (const stat of letterStats) {
      expect(stat.letter).toMatch(/^[A-Z]$/);
      expect(typeof stat.count).toBe("number");
      expect(stat.count).toBeGreaterThanOrEqual(0);
      expect(stat.href).toMatch(/^\/dictionary\?letter=[A-Z]$/);
    }
  });

  it("total letter counts equals number of entries", () => {
    const total = letterStats.reduce((sum, s) => sum + s.count, 0);
    expect(total).toBe(entries.length);
  });
});

/* ---------- categoryStats ---------- */

describe("categoryStats", () => {
  it("has expected categories with descriptions", () => {
    expect(categoryStats.length).toBeGreaterThan(0);
    for (const stat of categoryStats) {
      expect(typeof stat.title).toBe("string");
      expect(typeof stat.slug).toBe("string");
      expect(typeof stat.description).toBe("string");
      expect(stat.description.length).toBeGreaterThan(0);
      expect(typeof stat.count).toBe("number");
      expect(Array.isArray(stat.sampleTerms)).toBe(true);
    }
  });

  it("total category assignments is >= number of entries (entries can be in multiple categories)", () => {
    const total = categoryStats.reduce((sum, s) => sum + s.count, 0);
    expect(total).toBeGreaterThanOrEqual(entries.length);
  });
});

/* ---------- relatedSlugs validity ---------- */

describe("relatedSlugs reference existing entries", () => {
  const allSlugs = new Set(entries.map((e) => e.slug));

  it.each(entries.map((e) => [e.slug, e]))(
    "%s relatedSlugs are all valid",
    (_slug, entry) => {
      for (const related of entry.relatedSlugs) {
        expect(allSlugs.has(related)).toBe(true);
      }
    },
  );

  it.each(entries.map((e) => [e.slug, e]))(
    "%s does not reference itself in relatedSlugs",
    (slug, entry) => {
      expect(entry.relatedSlugs).not.toContain(slug);
    },
  );
});

/* ---------- searchText includes key content ---------- */

describe("searchText includes entry title", () => {
  it.each(entries.map((e) => [e.slug, e]))(
    "%s searchText contains its title",
    (_slug, entry) => {
      expect(entry.searchText.toLowerCase()).toContain(entry.title.toLowerCase());
    },
  );
});

/* ---------- categories use valid slugs ---------- */

describe("categorySlugs match categories", () => {
  it.each(entries.map((e) => [e.slug, e]))(
    "%s has matching categorySlugs for each category",
    (_slug, entry) => {
      expect(entry.categorySlugs.length).toBe(entry.categories.length);
    },
  );
});
