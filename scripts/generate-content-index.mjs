import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import {
  assertValidEntry,
  buildSearchText,
  scoreRelatedEntries,
} from "../src/lib/content-build.mjs";
import {
  categoryDefinitions,
  featuredEntrySlug,
} from "../src/lib/content-catalog.mjs";

const root = process.cwd();
const entriesDirectory = path.join(root, "content", "entries");
const outputDirectory = path.join(root, "src", "generated");
const outputFile = path.join(outputDirectory, "entries.generated.json");

/* ---------- helpers ---------- */

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ---------- main ---------- */

async function buildEntryIndex() {
  const files = (await fs.readdir(entriesDirectory))
    .filter((file) => file.endsWith(".mdx"))
    .sort();

  const rawEntriesWithFiles = await Promise.all(
    files.map(async (filename) => {
      const source = await fs.readFile(path.join(entriesDirectory, filename), "utf8");
      const { data, content } = matter(source);

      // Apply defaults
      const entry = {
        ...data,
        aliases: data.aliases ?? [],
        related: data.related ?? [],
        seeAlso: data.seeAlso ?? [],
        vendorReferences: data.vendorReferences ?? [],
        tags: data.tags ?? [],
        isVendorTerm: data.isVendorTerm ?? false,
        misunderstoodScore: data.misunderstoodScore ?? 3,
        translations: data.translations ?? [],
        body: content.trim(),
      };

      assertValidEntry(entry, { filename });
      return { entry, filename };
    }),
  );
  const rawEntries = rawEntriesWithFiles.map(({ entry }) => entry);
  const knownSlugs = new Set(rawEntries.map((entry) => entry.slug));

  if (knownSlugs.size !== rawEntries.length) {
    throw new Error("Duplicate entry slugs were found in content/entries.");
  }

  for (const { entry, filename } of rawEntriesWithFiles) {
    assertValidEntry(entry, { filename, knownSlugs });
  }

  // Pre-compute related entries (needs all entries present)
  scoreRelatedEntries(rawEntries);

  // Enrich entries with pre-computed fields
  const entries = rawEntries.map((entry) => ({
    ...entry,
    categorySlugs: entry.categories.map((cat) => slugify(cat)),
    url: `/dictionary/${entry.slug}`,
    searchText: buildSearchText(entry),
    relatedSlugs: entry._relatedSlugs,
  }));

  // Remove temporary field
  for (const entry of entries) {
    delete entry._relatedSlugs;
  }

  // Sort alphabetically (the default order for getAllEntries)
  entries.sort((a, b) => a.title.localeCompare(b.title));

  // Pre-compute derived collections
  const recentEntries = [...entries]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 4)
    .map((e) => e.slug);
  const latestPublishedAt =
    entries.reduce((latest, entry) => {
      if (!latest) {
        return entry.publishedAt;
      }

      return new Date(entry.publishedAt).getTime() > new Date(latest).getTime()
        ? entry.publishedAt
        : latest;
    }, null) ?? "";

  const misunderstoodEntries = [...entries]
    .sort((a, b) => {
      if (b.misunderstoodScore !== a.misunderstoodScore) {
        return b.misunderstoodScore - a.misunderstoodScore;
      }
      return a.title.localeCompare(b.title);
    })
    .slice(0, 4)
    .map((e) => e.slug);

  // Letter stats
  const letterCounts = {};
  for (const entry of entries) {
    letterCounts[entry.letter] = (letterCounts[entry.letter] ?? 0) + 1;
  }
  const letterStats = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => ({
    letter,
    count: letterCounts[letter] ?? 0,
    href: `/dictionary?letter=${letter}`,
  }));

  // Category stats
  const categoryStats = categoryDefinitions.map((category) => {
    const catSlug = slugify(category.title);
    const matching = entries.filter((e) => e.categorySlugs.includes(catSlug));
    return {
      ...category,
      slug: catSlug,
      count: matching.length,
      sampleTerms: matching.slice(0, 3).map((e) => e.title),
    };
  });

  const featuredSlug = entries.find((e) => e.slug === featuredEntrySlug)?.slug;
  if (!featuredSlug) {
    throw new Error(`Featured entry "${featuredEntrySlug}" not found in entries`);
  }

  const output = {
    entries,
    recentSlugs: recentEntries,
    misunderstoodSlugs: misunderstoodEntries,
    letterStats,
    categoryStats,
    featuredSlug,
    latestPublishedAt,
  };

  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.writeFile(outputFile, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(
    `Generated ${entries.length} dictionary entries into ${path.relative(root, outputFile)}`,
  );
}

buildEntryIndex().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
