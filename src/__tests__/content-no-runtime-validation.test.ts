/**
 * Tests that src/lib/content.ts does NOT perform expensive runtime operations.
 *
 * These tests guard against regression to the pattern that caused Cloudflare
 * Error 1102. The content module must be a thin reader of pre-computed data —
 * no Zod parsing, no search-text building, no related-entry scoring at runtime.
 */

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const contentSource = fs.readFileSync(
  path.resolve(__dirname, "../lib/content.ts"),
  "utf8",
);

describe("content.ts has no expensive runtime operations", () => {
  it("does not import zod", () => {
    // Zod validation of 62 entries on every cold start was the #1 cause
    // of Error 1102. It must only happen at build time.
    expect(contentSource).not.toMatch(/from ["']zod["']/);
    expect(contentSource).not.toMatch(/import.*zod/);
  });

  it("does not call .parse() at module level", () => {
    // generatedEntriesSchema.parse(rawEntries) was running on every request
    expect(contentSource).not.toMatch(/\.parse\(/);
  });

  it("does not contain buildSearchText function", () => {
    // searchText must be pre-computed at build time
    expect(contentSource).not.toMatch(/function buildSearchText/);
  });

  it("does not contain validateCategories function", () => {
    // Category validation must happen at build time
    expect(contentSource).not.toMatch(/function validateCategories/);
  });

  it("does not contain O(n²) related entry scoring", () => {
    // Related entries must be pre-computed, not scored at request time
    expect(contentSource).not.toMatch(/sharedCategories/);
    expect(contentSource).not.toMatch(/sharedTags/);
  });

  it("does not sort entries at runtime in getAllEntries", () => {
    // Entries must arrive pre-sorted from the generated JSON
    expect(contentSource).not.toMatch(/\.sort\(/);
  });

  it("does not construct Date objects for sorting", () => {
    // Recent/misunderstood sorting must be pre-computed
    expect(contentSource).not.toMatch(/new Date\(/);
  });
});
