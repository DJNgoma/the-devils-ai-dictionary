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
import {
  createCatalogVersion,
  createCatalogSnapshot,
  publishMobileCatalogArtifacts,
  serializeCatalogSnapshot,
} from "../src/lib/mobile-catalog.mjs";

const root = process.cwd();
const entriesDirectory = path.join(root, "content", "entries");
const outputDirectory = path.join(root, "src", "generated");
const outputFile = path.join(outputDirectory, "entries.generated.json");
const publicCatalogDirectory = path.join(root, "public", "catalog");
const publicMobileCatalogDirectory = path.join(root, "public", "mobile-catalog");
const editorialTimeZone = "Africa/Johannesburg";
const schemaVersion = 1;

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
  const dailyWordEntries = [...entries].sort((left, right) => {
    if (left.publishedAt !== right.publishedAt) {
      return left.publishedAt.localeCompare(right.publishedAt);
    }

    return left.slug.localeCompare(right.slug);
  });
  const dailyWordStartDate = dailyWordEntries[0]?.publishedAt ?? "";

  const featuredSlug = entries.find((e) => e.slug === featuredEntrySlug)?.slug;
  if (!featuredSlug) {
    throw new Error(`Featured entry "${featuredEntrySlug}" not found in entries`);
  }

  const catalog = {
    entries,
    recentSlugs: recentEntries,
    misunderstoodSlugs: misunderstoodEntries,
    letterStats,
    categoryStats,
    editorialTimeZone,
    dailyWordStartDate,
    dailyWordSlugs: dailyWordEntries.map((entry) => entry.slug),
    featuredSlug,
    latestPublishedAt,
  };
  const catalogVersion = createCatalogVersion(catalog);
  let generatedAt = new Date().toISOString();

  try {
    const existingSnapshot = JSON.parse(await fs.readFile(outputFile, "utf8"));

    if (existingSnapshot.catalogVersion === catalogVersion) {
      generatedAt = existingSnapshot.generatedAt;
    }
  } catch {
    // No previous generated snapshot to reconcile against.
  }

  const snapshot = createCatalogSnapshot({
    schemaVersion,
    entryCount: entries.length,
    generatedAt,
    ...catalog,
  });
  const snapshotText = serializeCatalogSnapshot(snapshot);
  const versionedCatalogFilename = `catalog.${snapshot.catalogVersion}.json`;
  const versionManifest = {
    version: snapshot.catalogVersion,
    generatedAt: snapshot.generatedAt,
    path: `/catalog/${versionedCatalogFilename}`,
  };

  // The web worker imports entries.generated.json at cold start — strip
  // searchText (only needed by native apps) to keep the bundle lean.
  const webSnapshot = {
    ...snapshot,
    entries: snapshot.entries.map(({ searchText: _, ...rest }) => rest),
  };
  const webSnapshotText = serializeCatalogSnapshot(webSnapshot);

  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.writeFile(outputFile, webSnapshotText, "utf8");
  await fs.mkdir(publicCatalogDirectory, { recursive: true });

  const publishedCatalogFiles = await fs.readdir(publicCatalogDirectory);
  await Promise.all(
    publishedCatalogFiles
      .filter((filename) => /^catalog\.[a-f0-9]{64}\.json$/.test(filename))
      .filter((filename) => filename !== versionedCatalogFilename)
      .map((filename) => fs.rm(path.join(publicCatalogDirectory, filename), { force: true })),
  );

  await fs.writeFile(
    path.join(publicCatalogDirectory, versionedCatalogFilename),
    snapshotText,
    "utf8",
  );
  await fs.writeFile(
    path.join(publicCatalogDirectory, "version.json"),
    `${JSON.stringify(versionManifest, null, 2)}\n`,
    "utf8",
  );
  // Write the full snapshot (with searchText) to a temp file for the mobile
  // catalog publisher, which needs the complete entry data for native apps.
  const mobileCatalogSourceFile = `${outputFile}.mobile.tmp`;
  await fs.writeFile(mobileCatalogSourceFile, snapshotText, "utf8");
  const { manifest: mobileCatalogManifest } = await publishMobileCatalogArtifacts({
    snapshotSourceFile: mobileCatalogSourceFile,
    outputDirectory: publicMobileCatalogDirectory,
  });
  await fs.rm(mobileCatalogSourceFile, { force: true });

  console.log(
    `Generated ${entries.length} dictionary entries into ${path.relative(root, outputFile)}`,
  );
  console.log(
    `Published catalog manifest public/catalog/version.json -> ${versionManifest.path}`,
  );
  console.log(
    `Published mobile catalog manifest public/mobile-catalog/manifest.json -> ${mobileCatalogManifest.snapshotPath}`,
  );
}

buildEntryIndex().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
