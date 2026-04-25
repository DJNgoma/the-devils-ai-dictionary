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
import { entryDetailShardLoaders } from "@/generated/entry-detail-shards.generated";
import { compareMisunderstoodEntries } from "@/lib/content-build.mjs";
import { getAllEntries, getDictionaryWordCount, getEntryBySlug } from "@/lib/content";

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

const { entries: webEntries, searchIndexPath } = webGeneratedData as typeof webGeneratedData & {
  searchIndexPath: string;
};

type GeneratedReference = {
  label: string;
  entrySlug?: string;
};

function expectNoFailures(failures: string[]) {
  expect(failures).toEqual([]);
}

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

describe("each full raw entry keeps the expensive pre-computed fields", () => {
  it("all entries have relatedSlugs", () => {
    const failures: string[] = [];

    for (const entry of entries) {
      // Related-entry scoring is still computed at build time so the worker
      // does not have to rebuild those relationships on demand.
      if (!Array.isArray(entry.relatedSlugs)) {
        failures.push(`${entry.slug}: relatedSlugs is not an array`);
      }
    }

    expectNoFailures(failures);
  });
});

describe("web snapshot", () => {
  it("matches the full catalog version while omitting heavy entry fields", () => {
    expect(webGeneratedData.catalogVersion).toBe(catalogVersion);
    expect(webGeneratedData.entryCount).toBe(entryCount);
    expect(webGeneratedData.entries).toHaveLength(entries.length);
    expect(searchIndexPath).toMatch(/^\/catalog\/search-index\.[a-f0-9]{64}\.json$/);

    const entry = webGeneratedData.entries[0];
    expect(entry).toBeDefined();
    expect(entry).not.toHaveProperty("body");
    expect(entry).not.toHaveProperty("categorySlugs");
    expect(entry).not.toHaveProperty("relatedSlugs");
    expect(entry).not.toHaveProperty("searchText");
    expect(entry).not.toHaveProperty("seeAlso");
    expect(entry).not.toHaveProperty("vendorReferences");
    expect(entry).not.toHaveProperty("tags");
    expect(entry).not.toHaveProperty("misunderstoodScore");
    expect(entry).not.toHaveProperty("url");
  });
});

describe("entry detail shards", () => {
  it("cover every entry exactly once", async () => {
    const shards = await Promise.all(
      Object.values(entryDetailShardLoaders).map(async (loadShard) => {
        const shardModule = await loadShard();
        return shardModule.default as Record<string, unknown>;
      }),
    );
    const detailSlugs = shards.flatMap((shard) => Object.keys(shard));

    expect(new Set(detailSlugs).size).toBe(detailSlugs.length);
    expect(new Set(detailSlugs)).toEqual(new Set(entries.map((entry) => entry.slug)));
  });
});

describe("runtime entries restore cheap derived fields", () => {
  it("exposes the generated dictionary word count", async () => {
    await expect(getDictionaryWordCount()).resolves.toBe(entryCount);
  });

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
    expect(Array.isArray(entry!.resolvedSeeAlso)).toBe(true);
    expect(Array.isArray(entry!.translations)).toBe(true);
    expect(Array.isArray(entry!.vendorReferences)).toBe(true);
    expect(Array.isArray(entry!.resolvedVendorReferences)).toBe(true);
    expect(typeof entry!.body).toBe("string");
  });
});

describe("resolved reference metadata", () => {
  const entrySlugSet = new Set(entries.map((entry) => entry.slug));

  it("all entries resolve every see-also and vendor reference without self-links", () => {
    const failures: string[] = [];

    for (const entry of entries) {
      if (entry.resolvedSeeAlso.length !== entry.seeAlso.length) {
        failures.push(
          `${entry.slug}: resolvedSeeAlso has ${entry.resolvedSeeAlso.length} items for ${entry.seeAlso.length} seeAlso references`,
        );
      }

      if (entry.resolvedVendorReferences.length !== entry.vendorReferences.length) {
        failures.push(
          `${entry.slug}: resolvedVendorReferences has ${entry.resolvedVendorReferences.length} items for ${entry.vendorReferences.length} vendor references`,
        );
      }

      for (const reference of [
        ...entry.resolvedSeeAlso,
        ...entry.resolvedVendorReferences,
      ] as GeneratedReference[]) {
        if (typeof reference.label !== "string") {
          failures.push(`${entry.slug}: resolved reference has a non-string label`);
        }

        if (typeof reference.entrySlug !== "string") {
          failures.push(
            `${entry.slug}: resolved reference ${String(reference.label)} has a non-string entrySlug`,
          );
          continue;
        }

        if (!entrySlugSet.has(reference.entrySlug)) {
          failures.push(
            `${entry.slug}: resolved reference ${reference.label} points to unknown slug ${reference.entrySlug}`,
          );
        }

        if (reference.entrySlug === entry.slug) {
          failures.push(`${entry.slug}: resolved reference ${reference.label} links to itself`);
        }
      }
    }

    expectNoFailures(failures);
  });
});

describe("editorial quality gates", () => {
  const generatedPlaceholderPhrases = [
    "deserves a separate entry because it was already doing connective work",
    "adjacent AI concept used to frame the practical, cultural, product, or operational meaning",
    "A neighbouring idea that deserves its own definition before it starts doing rhetorical errands",
    "that tends to enter the room wearing a logo, a pricing model, and several implied assumptions",
  ];

  it("all entries avoid generated placeholder phrasing", () => {
    const failures: string[] = [];

    for (const entry of entries) {
      const searchableEditorialText = [
        entry.devilDefinition,
        entry.plainDefinition,
        entry.whyExists,
        entry.misuse,
        entry.practicalMeaning,
        entry.example,
        entry.warningLabel ?? "",
        entry.note ?? "",
        entry.body,
        ...entry.translations.map((translation) => translation.text),
      ].join("\n");

      for (const phrase of generatedPlaceholderPhrases) {
        if (searchableEditorialText.includes(phrase)) {
          failures.push(`${entry.slug}: contains generated placeholder phrase "${phrase}"`);
        }
      }
    }

    expectNoFailures(failures);
  });
});

describe("each entry has required frontmatter fields", () => {
  it("all entries have all required fields", () => {
    const failures: string[] = [];

    for (const entry of entries) {
      if (typeof entry.title !== "string" || entry.title.length === 0) {
        failures.push(`${entry.slug}: title is missing or empty`);
      }
      if (typeof entry.slug !== "string") {
        failures.push(`${entry.slug}: slug is not a string`);
      }
      if (typeof entry.letter !== "string" || !/^[A-Z]$/.test(entry.letter)) {
        failures.push(`${entry.slug}: letter is not A-Z`);
      }
      if (!Array.isArray(entry.categories) || entry.categories.length === 0) {
        failures.push(`${entry.slug}: categories is missing or empty`);
      }
      if (typeof entry.devilDefinition !== "string") {
        failures.push(`${entry.slug}: devilDefinition is not a string`);
      }
      if (typeof entry.plainDefinition !== "string") {
        failures.push(`${entry.slug}: plainDefinition is not a string`);
      }
      if (!["beginner", "intermediate", "advanced"].includes(entry.difficulty)) {
        failures.push(`${entry.slug}: difficulty is invalid`);
      }
      if (!["low", "medium", "high"].includes(entry.technicalDepth)) {
        failures.push(`${entry.slug}: technicalDepth is invalid`);
      }
      if (!["low", "medium", "high", "severe"].includes(entry.hypeLevel)) {
        failures.push(`${entry.slug}: hypeLevel is invalid`);
      }
      if (typeof entry.publishedAt !== "string") {
        failures.push(`${entry.slug}: publishedAt is not a string`);
      }
      if (typeof entry.updatedAt !== "string") {
        failures.push(`${entry.slug}: updatedAt is not a string`);
      }
    }

    expectNoFailures(failures);
  });
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

  it("all relatedSlugs are valid", () => {
    const failures: string[] = [];

    for (const entry of entries) {
      for (const related of entry.relatedSlugs) {
        if (!allSlugs.has(related)) {
          failures.push(`${entry.slug}: relatedSlugs includes unknown slug ${related}`);
        }
      }
    }

    expectNoFailures(failures);
  });

  it("no entry references itself in relatedSlugs", () => {
    const failures = entries
      .filter((entry) => entry.relatedSlugs.includes(entry.slug))
      .map((entry) => `${entry.slug}: relatedSlugs includes itself`);

    expectNoFailures(failures);
  });
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
