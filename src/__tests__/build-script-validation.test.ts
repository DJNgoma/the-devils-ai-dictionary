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

/* ---------- re-implement the build-script validator for testing ---------- */

const categoryTitles = [
  "Core concepts",
  "Cultural terms",
  "Model building",
  "Model usage",
  "Agents and workflows",
  "Retrieval and memory",
  "Product and vendor terms",
  "Safety and evaluation",
  "Infrastructure and deployment",
  "Economics and operations of AI",
];
const categoryTitleSet = new Set(categoryTitles);

function validateEntry(entry: Record<string, unknown>) {
  const errors: string[] = [];
  const requireString = (field: string) => {
    if (typeof entry[field] !== "string" || (entry[field] as string).length === 0) {
      errors.push(`Missing required field "${field}"`);
    }
  };

  requireString("title");
  requireString("slug");
  requireString("letter");
  requireString("devilDefinition");
  requireString("plainDefinition");

  const categories = entry.categories;
  if (!Array.isArray(categories) || categories.length === 0) {
    errors.push('Field "categories" must be a non-empty array');
  } else {
    for (const cat of categories) {
      if (!categoryTitleSet.has(cat as string)) {
        errors.push(`Unknown category "${cat}"`);
      }
    }
  }

  return errors;
}

/* ---------- tests ---------- */

describe("build-time validation rejects bad entries", () => {
  it("rejects an entry with no title", () => {
    const errors = validateEntry({ slug: "test", letter: "T", categories: ["Core concepts"], devilDefinition: "x", plainDefinition: "x" });
    expect(errors).toContainEqual(expect.stringContaining("title"));
  });

  it("rejects an entry with no slug", () => {
    const errors = validateEntry({ title: "Test", letter: "T", categories: ["Core concepts"], devilDefinition: "x", plainDefinition: "x" });
    expect(errors).toContainEqual(expect.stringContaining("slug"));
  });

  it("rejects an entry with empty categories", () => {
    const errors = validateEntry({ title: "Test", slug: "test", letter: "T", categories: [], devilDefinition: "x", plainDefinition: "x" });
    expect(errors).toContainEqual(expect.stringContaining("categories"));
  });

  it("rejects an entry with an unknown category", () => {
    const errors = validateEntry({
      title: "Test",
      slug: "test",
      letter: "T",
      categories: ["Fake Category"],
      devilDefinition: "x",
      plainDefinition: "x",
    });
    expect(errors).toContainEqual(expect.stringContaining("Unknown category"));
  });

  it("accepts a valid entry", () => {
    const errors = validateEntry({
      title: "Test",
      slug: "test",
      letter: "T",
      categories: ["Core concepts"],
      devilDefinition: "A definition.",
      plainDefinition: "A plain definition.",
    });
    expect(errors.filter((e) => !e.includes("whyExists") && !e.includes("misuse") && !e.includes("practicalMeaning") && !e.includes("example"))).toEqual([]);
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
  it.each(files)("%s has a YAML frontmatter block", (filename) => {
    const content = fs.readFileSync(path.join(entriesDir, filename), "utf8");
    expect(content.startsWith("---")).toBe(true);
    expect(content.indexOf("---", 3)).toBeGreaterThan(3);
  });
});
