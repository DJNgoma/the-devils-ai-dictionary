import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  assertPrerenderAssetFastPath,
  assertWorkerStartupDoesNotEmbedWebSnapshot,
  assertBudget,
  parseWranglerGzipBytes,
  resolveWebSnapshotBudget,
  defaultCloudflareReleaseBudgets,
} from "../../scripts/cloudflare-release-gate.mjs";

describe("Cloudflare release gate helpers", () => {
  it("parses Wrangler compressed upload size", () => {
    expect(
      parseWranglerGzipBytes("Total Upload: 10068.90 KiB / gzip: 2295.79 KiB"),
    ).toBeCloseTo(2295.79 * 1024);
  });

  it("throws when a budget is exceeded", () => {
    expect(() => assertBudget("Worker gzip bundle", 11, 10)).toThrow(
      /Worker gzip bundle/,
    );
  });

  it("scales the web snapshot budget with entry count until the ceiling", () => {
    const { webSnapshotMetaBytes, webSnapshotBytesPerEntry, webSnapshotBytesCeiling } =
      defaultCloudflareReleaseBudgets;

    expect(resolveWebSnapshotBudget(100)).toBe(
      webSnapshotMetaBytes + 100 * webSnapshotBytesPerEntry,
    );
    expect(resolveWebSnapshotBudget(10_000)).toBe(webSnapshotBytesCeiling);
    expect(resolveWebSnapshotBudget(854)).toBeLessThan(webSnapshotBytesCeiling);
  });

  it("fails when startup chunks embed the web snapshot marker", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "devils-cf-gate-"));
    const chunkDir = path.join(
      root,
      ".open-next",
      "server-functions",
      "default",
      ".next",
      "server",
      "chunks",
      "ssr",
    );
    fs.mkdirSync(chunkDir, { recursive: true });
    fs.writeFileSync(
      path.join(chunkDir, "[root-of-the-server]__test._.js"),
      'const title = "Abstraction tax";',
    );

    expect(() =>
      assertWorkerStartupDoesNotEmbedWebSnapshot(root, {
        entries: [{ title: "Abstraction tax" }],
      }),
    ).toThrow(/embed web catalogue marker/);
  });

  it("requires prerendered assets and the worker fast-path header", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "devils-cf-gate-"));
    const prerenderDir = path.join(root, ".open-next", "assets", "__opennext-prerender");

    fs.writeFileSync(
      path.join(root, "wrangler.jsonc"),
      JSON.stringify({ assets: { html_handling: "none" } }),
    );

    for (const file of [
      "index.html",
      "index.rsc",
      "updates.html",
      "updates.rsc",
      "categories.html",
      "categories.rsc",
    ]) {
      fs.mkdirSync(path.dirname(path.join(prerenderDir, file)), { recursive: true });
      fs.writeFileSync(path.join(prerenderDir, file), "ok");
    }

    fs.writeFileSync(
      path.join(root, ".open-next", "worker.js"),
      'headers.set("x-devils-prerender-cache", "hit");',
    );

    expect(assertPrerenderAssetFastPath(root)).toMatch(/Prerender asset fast path/);
  });

  it("rejects Cloudflare HTML handling that redirects exact asset filenames", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "devils-cf-gate-"));

    fs.writeFileSync(
      path.join(root, "wrangler.jsonc"),
      JSON.stringify({ assets: { html_handling: "auto-trailing-slash" } }),
    );

    expect(() => assertPrerenderAssetFastPath(root)).toThrow(/html_handling/);
  });

  it("fetches prerendered HTML by its exact asset filename", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../scripts/run-opennext-cloudflare.mjs"),
      "utf8",
    );

    expect(source).toContain('const assetPath = variant === "route"');
    expect(source).not.toContain('variant === "route" || variant === "html"');
  });
});
