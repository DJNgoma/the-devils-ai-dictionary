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
import webGeneratedData from "@/generated/entries.web.generated.json";
import { compareMisunderstoodEntries } from "@/lib/content-build.mjs";
import {
  getAllEntries,
  getEntryBySlug,
  getLatestAddedBatch,
  getPublishedEntryBatches,
} from "@/lib/content";

const {
  schemaVersion,
  catalogVersion,
  generatedAt,
  entryCount,
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

const { entries: webEntries } = webGeneratedData;

/* ---------- top-level structure ---------- */

describe("generated data top-level structure", () => {
  it("has all required top-level keys", () => {
    expect(generatedData).toHaveProperty("schemaVersion");
    expect(generatedData).toHaveProperty("catalogVersion");
    expect(generatedData).toHaveProperty("generatedAt");
    expect(generatedData).toHaveProperty("entryCount");
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

  it("includes stable OTA metadata", () => {
    expect(schemaVersion).toBe(1);
    expect(catalogVersion).toMatch(/^[a-f0-9]{64}$/);
    expect(typeof generatedAt).toBe("string");
    expect(Number.isNaN(Date.parse(generatedAt))).toBe(false);
    expect(entryCount).toBe(entries.length);
  });
});

/* ---------- entry shape ---------- */

describe("each raw entry keeps the expensive pre-computed fields", () => {
  it.each(webEntries.map((e) => [e.slug, e]))(
    "%s has relatedSlugs",
    (_slug, entry) => {
      // Related-entry scoring is still computed at build time so the worker
      // does not have to rebuild those relationships on demand.
      expect(Array.isArray(entry.relatedSlugs)).toBe(true);
    },
  );
});

describe("web snapshot", () => {
  it("matches the full catalog version while omitting heavy entry fields", () => {
    expect(webGeneratedData.catalogVersion).toBe(catalogVersion);
    expect(webGeneratedData.entryCount).toBe(entryCount);
    expect(webGeneratedData.entries).toHaveLength(entries.length);

    const entry = webGeneratedData.entries[0];
    expect(entry).toBeDefined();
    expect(entry).not.toHaveProperty("body");
    expect(entry).not.toHaveProperty("categorySlugs");
    expect(entry).not.toHaveProperty("url");
  });
});

describe("runtime entries restore cheap derived fields", () => {
  it("restores categorySlugs and url for the web app", async () => {
    const runtimeEntries = await getAllEntries();

    for (const entry of runtimeEntries) {
      expect(Array.isArray(entry.categorySlugs)).toBe(true);
      expect(entry.categorySlugs.length).toBe(entry.categories.length);
      expect(entry.url).toMatch(/^\/dictionary\//);
    }
  });
});

describe("runtime entry hydration", () => {
  it("hydrates detail fields when loading a single entry", async () => {
    const entry = await getEntryBySlug(webEntries[0]!.slug);

    expect(entry).toBeDefined();
    expect(Array.isArray(entry!.seeAlso)).toBe(true);
    expect(Array.isArray(entry!.translations)).toBe(true);
    expect(Array.isArray(entry!.vendorReferences)).toBe(true);
    expect(typeof entry!.body).toBe("string");
  });
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

  it("uses score, recency, and title as deterministic tie-breakers", () => {
    const expectedSlugs = [...entries]
      .sort(compareMisunderstoodEntries)
      .slice(0, 4)
      .map((entry) => entry.slug);

    expect(misunderstoodSlugs).toEqual(expectedSlugs);
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
  it("uses the editorial timezone and covers every entry once", () => {
    const allSlugs = new Set(entries.map((e) => e.slug));

    expect(editorialTimeZone).toBe("Africa/Johannesburg");
    expect(typeof dailyWordStartDate).toBe("string");
    expect(Array.isArray(dailyWordSlugs)).toBe(true);
    expect(dailyWordSlugs.length).toBe(entries.length);
    expect(new Set(dailyWordSlugs).size).toBe(entries.length);
    expect(dailyWordSlugs.every((slug) => allSlugs.has(slug))).toBe(true);
  });

  it("starts on the earliest published entry", () => {
    const earliestPublishedAt = entries.reduce((earliest, entry) => {
      if (!earliest) {
        return entry.publishedAt;
      }

      return new Date(entry.publishedAt).getTime() < new Date(earliest).getTime()
        ? entry.publishedAt
        : earliest;
    }, "");

    expect(dailyWordStartDate).toBe(earliestPublishedAt);
    expect(dailyWordSlugs[0]).toBe(
      entries.find((entry) => entry.publishedAt === earliestPublishedAt)?.slug,
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

  it("exposes the complete latest publish batch", async () => {
    const latestBatch = await getLatestAddedBatch();
    const expectedSlugs = entries
      .filter((entry) => entry.publishedAt === latestPublishedAt)
      .sort((left, right) => {
        const titleDifference = left.title.localeCompare(right.title);
        return titleDifference !== 0
          ? titleDifference
          : left.slug.localeCompare(right.slug);
      })
      .map((entry) => entry.slug);

    expect(latestBatch.publishedAt).toBe(latestPublishedAt);
    expect(latestBatch.count).toBe(expectedSlugs.length);
    expect(latestBatch.entries.map((entry) => entry.slug)).toEqual(expectedSlugs);
  });
});

describe("published entry batches", () => {
  it("groups all entries by publishedAt in reverse chronological order", async () => {
    const batches = await getPublishedEntryBatches();
    const totalEntries = batches.reduce((total, batch) => total + batch.count, 0);

    expect(totalEntries).toBe(entries.length);

    for (let index = 0; index < batches.length; index++) {
      const batch = batches[index]!;
      expect(batch.count).toBe(batch.entries.length);
      expect(batch.entries.every((entry) => entry.publishedAt === batch.publishedAt)).toBe(true);

      if (index > 0) {
        const previous = new Date(batches[index - 1]!.publishedAt).getTime();
        const current = new Date(batch.publishedAt).getTime();
        expect(previous).toBeGreaterThanOrEqual(current);
      }
    }
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

/* ---------- categories use valid slugs ---------- */

describe("categorySlugs match categories", () => {
  it("runtime entries keep category slugs aligned with category titles", async () => {
    const runtimeEntries = await getAllEntries();

    for (const entry of runtimeEntries) {
      expect(entry.categorySlugs.length).toBe(entry.categories.length);
    }
  });
});
