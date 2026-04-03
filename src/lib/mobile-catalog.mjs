import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const mobileCatalogSchemaVersion = 1;

export function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export function createCatalogVersionSeed(catalog) {
  return {
    schemaVersion: mobileCatalogSchemaVersion,
    entryCount: catalog.entries.length,
    entries: catalog.entries,
    recentSlugs: catalog.recentSlugs,
    misunderstoodSlugs: catalog.misunderstoodSlugs,
    letterStats: catalog.letterStats,
    categoryStats: catalog.categoryStats,
    editorialTimeZone: catalog.editorialTimeZone,
    dailyWordStartDate: catalog.dailyWordStartDate,
    dailyWordSlugs: catalog.dailyWordSlugs,
    featuredSlug: catalog.featuredSlug,
    latestPublishedAt: catalog.latestPublishedAt,
  };
}

export function createCatalogVersion(catalog) {
  return sha256Hex(stableStringify(createCatalogVersionSeed(catalog)));
}

export function createCatalogSnapshot(catalog) {
  return {
    schemaVersion: mobileCatalogSchemaVersion,
    catalogVersion: createCatalogVersion(catalog),
    generatedAt: catalog.generatedAt ?? new Date().toISOString(),
    entryCount: catalog.entries.length,
    ...catalog,
  };
}

export function serializeCatalogSnapshot(snapshot) {
  return `${JSON.stringify(snapshot, null, 2)}\n`;
}

export function createMobileCatalogManifest({
  snapshot,
  snapshotText,
  basePath = "/mobile-catalog",
  publishedAt = snapshot.generatedAt ?? new Date().toISOString(),
}) {
  const snapshotFilename = `entries.${snapshot.catalogVersion}.json`;
  const normalizedBasePath = basePath.endsWith("/")
    ? basePath.slice(0, -1)
    : basePath;
  const snapshotPath = `${normalizedBasePath}/${snapshotFilename}`;

  return {
    schemaVersion: snapshot.schemaVersion,
    catalogVersion: snapshot.catalogVersion,
    entryCount: snapshot.entryCount,
    latestPublishedAt: snapshot.latestPublishedAt,
    publishedAt,
    snapshotPath,
    sha256: sha256Hex(snapshotText),
    bytes: Buffer.byteLength(snapshotText),
  };
}

export async function publishMobileCatalogArtifacts({
  snapshotSourceFile,
  outputDirectory,
}) {
  const snapshotText = await fs.readFile(snapshotSourceFile, "utf8");
  const snapshot = JSON.parse(snapshotText);
  const manifest = createMobileCatalogManifest({ snapshot, snapshotText });
  const snapshotFilename = path.basename(manifest.snapshotPath);
  const manifestFile = path.join(outputDirectory, "manifest.json");
  const snapshotFile = path.join(outputDirectory, snapshotFilename);
  const temporaryManifestFile = path.join(
    outputDirectory,
    `manifest.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`,
  );

  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.writeFile(snapshotFile, snapshotText, "utf8");
  await fs.writeFile(temporaryManifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await fs.rename(temporaryManifestFile, manifestFile);

  const files = await fs.readdir(outputDirectory);
  await Promise.all(
    files
      .filter(
        (file) =>
          file.startsWith("entries.") &&
          file.endsWith(".json") &&
          file !== snapshotFilename,
      )
      .map((file) => fs.rm(path.join(outputDirectory, file), { force: true })),
  );

  return {
    manifest,
    manifestFile,
    snapshotFile,
  };
}
