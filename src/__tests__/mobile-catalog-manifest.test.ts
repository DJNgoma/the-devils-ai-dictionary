import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import generatedData from "@/generated/entries.generated.json";
import {
  createCatalogSnapshot,
  createMobileCatalogManifest,
  publishMobileCatalogArtifacts,
  sha256Hex,
} from "@/lib/mobile-catalog.mjs";

const generatedSnapshotText = fs.readFileSync(
  path.resolve(__dirname, "../generated/entries.generated.json"),
  "utf8",
);

const tempDirectories: string[] = [];

afterEach(() => {
  while (tempDirectories.length > 0) {
    const directory = tempDirectories.pop();
    if (directory) {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }
});

describe("mobile catalog manifest", () => {
  it("generates a stable manifest for the current snapshot", () => {
    const manifest = createMobileCatalogManifest({
      snapshot: generatedData,
      snapshotText: generatedSnapshotText,
      publishedAt: "2026-04-02T00:00:00.000Z",
    });

    expect(manifest.schemaVersion).toBe(generatedData.schemaVersion);
    expect(manifest.catalogVersion).toBe(generatedData.catalogVersion);
    expect(manifest.entryCount).toBe(generatedData.entryCount);
    expect(manifest.latestPublishedAt).toBe(generatedData.latestPublishedAt);
    expect(manifest.snapshotPath).toBe(
      `/mobile-catalog/entries.${generatedData.catalogVersion}.json`,
    );
    expect(manifest.sha256).toBe(sha256Hex(generatedSnapshotText));
    expect(manifest.bytes).toBe(Buffer.byteLength(generatedSnapshotText));
    expect(manifest.compatibility).toEqual({
      minimumAppVersion: null,
      minimumAppleBuildNumber: null,
      minimumAndroidVersionCode: null,
      updateStatus: "none",
      upgradeMessage: null,
    });
  });

  it("derives catalogVersion from stable catalog content", () => {
    // The tracked catalog snapshot in public/catalog is the canonical
    // full-fidelity version that native clients and OTA publishing use.
    const versionManifestPath = path.resolve(__dirname, "../../public/catalog/version.json");
    if (!fs.existsSync(versionManifestPath)) return;
    const versionManifest = JSON.parse(fs.readFileSync(versionManifestPath, "utf8"));
    const catalogSnapshotPath = path.resolve(
      __dirname, "../../public", versionManifest.path.slice(1),
    );
    const catalogSnapshot = JSON.parse(fs.readFileSync(catalogSnapshotPath, "utf8"));

    const baseCatalog = {
      entries: catalogSnapshot.entries,
      recentSlugs: catalogSnapshot.recentSlugs,
      misunderstoodSlugs: catalogSnapshot.misunderstoodSlugs,
      letterStats: catalogSnapshot.letterStats,
      categoryStats: catalogSnapshot.categoryStats,
      editorialTimeZone: catalogSnapshot.editorialTimeZone,
      dailyWordStartDate: catalogSnapshot.dailyWordStartDate,
      dailyWordSlugs: catalogSnapshot.dailyWordSlugs,
      featuredSlug: catalogSnapshot.featuredSlug,
      latestPublishedAt: catalogSnapshot.latestPublishedAt,
    };

    const snapshot = createCatalogSnapshot({
      ...baseCatalog,
      generatedAt: catalogSnapshot.generatedAt,
    });

    expect(snapshot.catalogVersion).toBe(versionManifest.version);
    expect(snapshot.catalogVersion).toBe(generatedData.catalogVersion);
  });

  it("publishes a manifest and prunes stale immutable snapshots", async () => {
    const outputDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "mobile-catalog-publish-test-"),
    );
    tempDirectories.push(outputDirectory);
    fs.writeFileSync(
      path.join(outputDirectory, `entries.${"a".repeat(64)}.json`),
      "{}\n",
      "utf8",
    );
    fs.writeFileSync(path.join(outputDirectory, "entries.keep-me.txt"), "", "utf8");

    const result = await publishMobileCatalogArtifacts({
      snapshotSourceFile: path.resolve(__dirname, "../generated/entries.generated.json"),
      outputDirectory,
    });

    const files = fs.readdirSync(outputDirectory).sort();
    expect(files).toContain("entries.keep-me.txt");
    expect(files).toContain("manifest.json");
    expect(files).toContain(path.basename(result.snapshotFile));
    expect(files).not.toContain(`entries.${"a".repeat(64)}.json`);
    expect(JSON.parse(fs.readFileSync(result.manifestFile, "utf8"))).toEqual(result.manifest);
  });

  it("can publish into the same directory concurrently", async () => {
    const outputDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "mobile-catalog-publish-concurrency-test-"),
    );
    tempDirectories.push(outputDirectory);

    const [first, second] = await Promise.all([
      publishMobileCatalogArtifacts({
        snapshotSourceFile: path.resolve(__dirname, "../generated/entries.generated.json"),
        outputDirectory,
      }),
      publishMobileCatalogArtifacts({
        snapshotSourceFile: path.resolve(__dirname, "../generated/entries.generated.json"),
        outputDirectory,
      }),
    ]);

    expect(first.manifest.catalogVersion).toBe(generatedData.catalogVersion);
    expect(second.manifest.catalogVersion).toBe(generatedData.catalogVersion);
    expect(JSON.parse(fs.readFileSync(path.join(outputDirectory, "manifest.json"), "utf8"))).toEqual(
      second.manifest,
    );
  });
});
