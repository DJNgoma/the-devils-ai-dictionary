/**
 * Tests that the build script catches invalid entries at build time
 * (rather than letting them slip through to crash the Worker at runtime).
 *
 * These tests run the validation logic from the build script against
 * known-bad inputs to confirm they would be rejected before deployment.
 */

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  buildResolvedEntryReferences,
  collectEntryValidationErrors,
  collectUnresolvedEntryReferences,
  createEntryReferenceResolver,
} from "@/lib/content-build.mjs";

/* ---------- tests ---------- */

describe("build-time validation rejects bad entries", () => {
  it("rejects an entry with no title", () => {
    const errors = collectEntryValidationErrors({
      slug: "test",
      letter: "T",
      categories: ["Core concepts"],
      devilDefinition: "x",
      plainDefinition: "x",
    });
    expect(errors).toContainEqual(expect.stringContaining("title"));
  });

  it("rejects an entry with no slug", () => {
    const errors = collectEntryValidationErrors({
      title: "Test",
      letter: "T",
      categories: ["Core concepts"],
      devilDefinition: "x",
      plainDefinition: "x",
    });
    expect(errors).toContainEqual(expect.stringContaining("slug"));
  });

  it("rejects an entry with empty categories", () => {
    const errors = collectEntryValidationErrors({
      title: "Test",
      slug: "test",
      letter: "T",
      categories: [],
      devilDefinition: "x",
      plainDefinition: "x",
    });
    expect(errors).toContainEqual(expect.stringContaining("categories"));
  });

  it("rejects an entry with an unknown category", () => {
    const errors = collectEntryValidationErrors({
      title: "Test",
      slug: "test",
      letter: "T",
      categories: ["Fake Category"],
      devilDefinition: "x",
      plainDefinition: "x",
    });
    expect(errors).toContainEqual(expect.stringContaining("Unknown category"));
  });

  it("rejects unparseable dates", () => {
    const errors = collectEntryValidationErrors({
      title: "Test",
      slug: "test",
      letter: "T",
      categories: ["Core concepts"],
      askNext: ["What changes when it ships?"],
      devilDefinition: "A definition.",
      plainDefinition: "A plain definition.",
      whyExists: "Because people need a name for it.",
      misuse: "People call everything this.",
      practicalMeaning: "It matters in production.",
      example: "An example.",
      difficulty: "beginner",
      technicalDepth: "low",
      hypeLevel: "medium",
      publishedAt: "yesterday sometime",
      updatedAt: "2026-03-01T00:00:00.000Z",
    });
    expect(errors).toContainEqual(expect.stringContaining("publishedAt"));
  });

  it("rejects an entry with an empty askNext array", () => {
    const errors = collectEntryValidationErrors({
      title: "Test",
      slug: "test",
      letter: "T",
      categories: ["Core concepts"],
      askNext: [],
      devilDefinition: "A definition.",
      plainDefinition: "A plain definition.",
      whyExists: "Because people need a name for it.",
      misuse: "People call everything this.",
      practicalMeaning: "It matters in production.",
      example: "An example.",
      difficulty: "beginner",
      technicalDepth: "low",
      hypeLevel: "medium",
      publishedAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
    });
    expect(errors).toContainEqual(expect.stringContaining("askNext"));
  });

  it("rejects invalid optional string arrays", () => {
    const errors = collectEntryValidationErrors({
      title: "Test",
      slug: "test",
      letter: "T",
      categories: ["Core concepts"],
      askNext: ["What changes when it ships?"],
      devilDefinition: "A definition.",
      plainDefinition: "A plain definition.",
      whyExists: "Because people need a name for it.",
      misuse: "People call everything this.",
      practicalMeaning: "It matters in production.",
      example: "An example.",
      difficulty: "beginner",
      technicalDepth: "low",
      hypeLevel: "medium",
      publishedAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
      aliases: ["good", ""],
      tags: "not-an-array",
      related: ["valid", 42],
      seeAlso: ["", "other"],
      vendorReferences: [null],
    });
    expect(errors).toContainEqual(expect.stringContaining('"aliases"'));
    expect(errors).toContainEqual(expect.stringContaining('"tags"'));
    expect(errors).toContainEqual(expect.stringContaining('"related"'));
    expect(errors).toContainEqual(expect.stringContaining('"seeAlso"'));
    expect(errors).toContainEqual(expect.stringContaining('"vendorReferences"'));
  });

  it("rejects invalid translation objects", () => {
    const errors = collectEntryValidationErrors({
      title: "Test",
      slug: "test",
      letter: "T",
      categories: ["Core concepts"],
      askNext: ["What changes when it ships?"],
      devilDefinition: "A definition.",
      plainDefinition: "A plain definition.",
      whyExists: "Because people need a name for it.",
      misuse: "People call everything this.",
      practicalMeaning: "It matters in production.",
      example: "An example.",
      difficulty: "beginner",
      technicalDepth: "low",
      hypeLevel: "medium",
      publishedAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
      translations: [{ label: "French" }],
    });
    expect(errors).toContainEqual(expect.stringContaining("translations"));
  });

  it("rejects invalid enum fields", () => {
    const errors = collectEntryValidationErrors({
      title: "Test",
      slug: "test",
      letter: "T",
      categories: ["Core concepts"],
      askNext: ["What changes when it ships?"],
      devilDefinition: "A definition.",
      plainDefinition: "A plain definition.",
      whyExists: "Because people need a name for it.",
      misuse: "People call everything this.",
      practicalMeaning: "It matters in production.",
      example: "An example.",
      difficulty: "expert",
      technicalDepth: "extreme",
      hypeLevel: "catastrophic",
      publishedAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
    });
    expect(errors).toContainEqual(expect.stringContaining("difficulty"));
    expect(errors).toContainEqual(expect.stringContaining("technicalDepth"));
    expect(errors).toContainEqual(expect.stringContaining("hypeLevel"));
  });

  it("rejects misunderstood scores outside the editorial range", () => {
    const errors = collectEntryValidationErrors({
      title: "Test",
      slug: "test",
      letter: "T",
      categories: ["Core concepts"],
      askNext: ["What changes when it ships?"],
      devilDefinition: "A definition.",
      plainDefinition: "A plain definition.",
      whyExists: "Because people need a name for it.",
      misuse: "People call everything this.",
      practicalMeaning: "It matters in production.",
      example: "An example.",
      difficulty: "beginner",
      technicalDepth: "low",
      hypeLevel: "medium",
      publishedAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
      misunderstoodScore: 6,
    });
    expect(errors).toContainEqual(expect.stringContaining("misunderstoodScore"));
  });

  it("rejects invalid diagram keys", () => {
    const errors = collectEntryValidationErrors({
      title: "Test",
      slug: "test",
      letter: "T",
      categories: ["Core concepts"],
      askNext: ["What changes when it ships?"],
      devilDefinition: "A definition.",
      plainDefinition: "A plain definition.",
      whyExists: "Because people need a name for it.",
      misuse: "People call everything this.",
      practicalMeaning: "It matters in production.",
      example: "An example.",
      difficulty: "beginner",
      technicalDepth: "low",
      hypeLevel: "medium",
      publishedAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
      diagram: "powerpoint-fog",
    });
    expect(errors).toContainEqual(expect.stringContaining("Invalid diagram"));
  });

  it("rejects related slugs that are not in the catalogue", () => {
    const errors = collectEntryValidationErrors(
      {
        title: "Test",
        slug: "test",
        letter: "T",
        categories: ["Core concepts"],
        askNext: ["What changes when it ships?"],
        devilDefinition: "A definition.",
        plainDefinition: "A plain definition.",
        whyExists: "Because people need a name for it.",
        misuse: "People call everything this.",
        practicalMeaning: "It matters in production.",
        example: "An example.",
        difficulty: "beginner",
        technicalDepth: "low",
        hypeLevel: "medium",
        publishedAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-01T00:00:00.000Z",
        related: ["missing-slug"],
      },
      { knownSlugs: new Set(["test", "agent"]) },
    );
    expect(errors).toContainEqual(expect.stringContaining("Unknown related slug"));
  });

  it("accepts a valid entry", () => {
    const errors = collectEntryValidationErrors({
      title: "Test",
      slug: "test",
      letter: "T",
      categories: ["Core concepts"],
      askNext: ["What changes when it ships?"],
      devilDefinition: "A definition.",
      plainDefinition: "A plain definition.",
      whyExists: "Because people need a name for it.",
      misuse: "People call everything this.",
      practicalMeaning: "It matters in production.",
      example: "An example.",
      difficulty: "beginner",
      technicalDepth: "low",
      hypeLevel: "medium",
      publishedAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
    });
    expect(errors).toEqual([]);
  });
});

describe("build-time reference resolution", () => {
  const entries = [
    {
      title: "Prompt Architecture",
      slug: "prompt-architecture",
      aliases: ["prompt design"],
      seeAlso: ["Instruction Hierarchy", "Prompt design", "Missing idea"],
      vendorReferences: [],
    },
    {
      title: "Instruction Hierarchy",
      slug: "instruction-hierarchy",
      aliases: [],
      seeAlso: ["Instruction Hierarchy"],
      vendorReferences: [],
    },
  ];

  it("resolves labels by slugified title and alias without self-links", () => {
    const resolveEntryReference = createEntryReferenceResolver(entries);

    expect(resolveEntryReference("Instruction Hierarchy")?.slug).toBe("instruction-hierarchy");
    expect(resolveEntryReference("prompt design")?.slug).toBe("prompt-architecture");
    expect(
      resolveEntryReference("Instruction Hierarchy", {
        excludeSlug: "instruction-hierarchy",
      }),
    ).toBeUndefined();
  });

  it("builds resolved reference metadata and reports only true misses", () => {
    const resolveEntryReference = createEntryReferenceResolver(entries);

    expect(
      buildResolvedEntryReferences(entries[0], "seeAlso", resolveEntryReference),
    ).toEqual([
      { label: "Instruction Hierarchy", entrySlug: "instruction-hierarchy" },
      { label: "Prompt design" },
      { label: "Missing idea" },
    ]);
    expect(collectUnresolvedEntryReferences(entries)).toContainEqual(
      expect.objectContaining({
        entrySlug: "prompt-architecture",
        field: "seeAlso",
        label: "Missing idea",
      }),
    );
  });
});

/* ---------- all real MDX files parse successfully ---------- */

describe("all content/entries/*.mdx files have required frontmatter keys", () => {
  const entriesDir = path.resolve(__dirname, "../../content/entries");
  const files = fs.readdirSync(entriesDir).filter((f) => f.endsWith(".mdx"));

  it("found MDX files to test", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  // Light structural check — the real validation runs in the build script,
  // but this catches files that are completely broken (missing frontmatter block).
  it("all files have a YAML frontmatter block", () => {
    const failures: string[] = [];

    for (const filename of files) {
      const content = fs.readFileSync(path.join(entriesDir, filename), "utf8");

      if (!content.startsWith("---")) {
        failures.push(`${filename}: missing opening frontmatter delimiter`);
      }

      if (content.indexOf("---", 3) <= 3) {
        failures.push(`${filename}: missing closing frontmatter delimiter`);
      }
    }

    expect(failures).toEqual([]);
  });
});

describe("mobile catalog artifacts", () => {
  const publicCatalogDir = path.resolve(__dirname, "../../public/mobile-catalog");
  const generatedCatalogPath = path.resolve(__dirname, "../../src/generated/entries.generated.json");
  const manifestExists = fs.existsSync(path.join(publicCatalogDir, "manifest.json"));

  it.skipIf(!manifestExists)("writes a manifest that points at an existing immutable snapshot file", () => {
    const manifestPath = path.join(publicCatalogDir, "manifest.json");

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    expect(manifest.catalogVersion).toMatch(/^[a-f0-9]{64}$/);
    expect(typeof manifest.publishedAt).toBe("string");
    expect(manifest.snapshotPath).toMatch(
      /^\/mobile-catalog\/entries\.[a-f0-9]{64}\.json$/,
    );

    const absoluteCatalogPath = path.resolve(
      __dirname,
      "../../public",
      manifest.snapshotPath.slice(1),
    );
    expect(fs.existsSync(absoluteCatalogPath)).toBe(true);
  });

  it.skipIf(!manifestExists)("keeps generated and published mobile catalog versions in sync", () => {
    const generatedCatalog = JSON.parse(fs.readFileSync(generatedCatalogPath, "utf8"));
    const manifest = JSON.parse(
      fs.readFileSync(path.join(publicCatalogDir, "manifest.json"), "utf8"),
    );
    const publishedCatalog = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, "../../public", manifest.snapshotPath.slice(1)),
        "utf8",
      ),
    );

    expect(generatedCatalog.catalogVersion).toBe(manifest.catalogVersion);
    expect(publishedCatalog.catalogVersion).toBe(manifest.catalogVersion);
    expect(publishedCatalog.entryCount).toBe(generatedCatalog.entryCount);
    expect(publishedCatalog.entries.length).toBe(generatedCatalog.entries.length);
  });
});

describe("public catalog artifacts", () => {
  const publicCatalogDir = path.resolve(__dirname, "../../public/catalog");
  const generatedCatalogPath = path.resolve(__dirname, "../../src/generated/entries.generated.json");

  it("writes a version manifest that points at an existing versioned catalog file", () => {
    const manifestPath = path.join(publicCatalogDir, "version.json");
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    expect(manifest.version).toMatch(/^[a-f0-9]{64}$/);
    expect(typeof manifest.generatedAt).toBe("string");
    expect(manifest.path).toMatch(/^\/catalog\/catalog\.[a-f0-9]{64}\.json$/);

    const absoluteCatalogPath = path.resolve(__dirname, "../../public", manifest.path.slice(1));
    expect(fs.existsSync(absoluteCatalogPath)).toBe(true);
  });

  it("keeps generated and public catalog versions in sync", () => {
    const generatedCatalog = JSON.parse(fs.readFileSync(generatedCatalogPath, "utf8"));
    const manifest = JSON.parse(
      fs.readFileSync(path.join(publicCatalogDir, "version.json"), "utf8"),
    );
    const publishedCatalog = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../public", manifest.path.slice(1)), "utf8"),
    );

    expect(generatedCatalog.catalogVersion).toBe(manifest.version);
    expect(publishedCatalog.catalogVersion).toBe(manifest.version);
    expect(publishedCatalog.entries.length).toBe(generatedCatalog.entries.length);
  });
});

describe("generated JSON size budget", () => {
  const webGeneratedPath = path.resolve(__dirname, "../../src/generated/entries.web.generated.json");
  const detailShardDir = path.resolve(__dirname, "../../src/generated/entry-details");

  it("keeps the lazy web snapshot under 560 KB", () => {
    const stats = fs.statSync(webGeneratedPath);
    const sizeKB = stats.size / 1024;
    expect(sizeKB).toBeLessThan(560);
  });

  it("keeps entry details split into bounded lazy shards", () => {
    expect(fs.existsSync(path.resolve(__dirname, "../../src/generated/entry-details.generated.json"))).toBe(false);
    const shardFiles = fs.readdirSync(detailShardDir).filter((file) => file.endsWith(".json"));

    expect(shardFiles.length).toBeGreaterThan(0);

    for (const shardFile of shardFiles) {
      const sizeKB = fs.statSync(path.join(detailShardDir, shardFile)).size / 1024;
      expect(sizeKB).toBeLessThan(160);
    }
  });

  it("publishes the browser search payload as a static catalog asset", () => {
    const webGenerated = JSON.parse(fs.readFileSync(webGeneratedPath, "utf8"));
    const searchIndexPath = path.resolve(
      __dirname,
      "../../public",
      webGenerated.searchIndexPath.slice(1),
    );

    expect(webGenerated.searchIndexPath).toMatch(/^\/catalog\/search-index\.[a-f0-9]{64}\.json$/);
    expect(fs.existsSync(searchIndexPath)).toBe(true);
    expect(fs.statSync(searchIndexPath).size / 1024).toBeLessThan(2048);
  });
});
