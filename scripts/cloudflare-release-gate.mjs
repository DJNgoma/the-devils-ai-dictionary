import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { pathToFileURL } from "node:url";

export const defaultCloudflareReleaseBudgets = {
  webSnapshotBytes: 560 * 1024,
  searchIndexBytes: 2 * 1024 * 1024,
  detailShardBytes: 160 * 1024,
  mobileSnapshotBytes: 5 * 1024 * 1024,
  workerGzipBytes: 2.8 * 1024 * 1024,
  updatesRscBytes: 750 * 1024,
  updatesOpenNextCacheBytes: 3.6 * 1024 * 1024,
  categoryOpenNextCacheBytes: 3.2 * 1024 * 1024,
};

function fileSize(filePath) {
  return fs.statSync(filePath).size;
}

function formatBytes(value) {
  return `${(value / 1024).toFixed(1)} KiB`;
}

export function parseWranglerGzipBytes(logText) {
  const match = logText.match(/Total Upload:\s*[\d.]+\s*KiB\s*\/\s*gzip:\s*([\d.]+)\s*KiB/i);
  return match ? Number.parseFloat(match[1]) * 1024 : undefined;
}

export function assertBudget(label, actual, limit) {
  if (actual > limit) {
    throw new Error(`${label} is ${formatBytes(actual)}, above budget ${formatBytes(limit)}.`);
  }

  return `${label}: ${formatBytes(actual)} / ${formatBytes(limit)}`;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function currentSearchIndexPath(root, webSnapshot) {
  const searchIndexPath = webSnapshot.searchIndexPath;

  if (typeof searchIndexPath !== "string" || !searchIndexPath.startsWith("/")) {
    throw new Error("entries.web.generated.json must include an absolute searchIndexPath.");
  }

  return path.join(root, "public", searchIndexPath.slice(1));
}

function currentMobileSnapshotPath(root) {
  const manifestPath = path.join(root, "public", "mobile-catalog", "manifest.json");
  const manifest = readJson(manifestPath);

  if (typeof manifest.snapshotPath !== "string" || !manifest.snapshotPath.startsWith("/")) {
    throw new Error("public/mobile-catalog/manifest.json must include an absolute snapshotPath.");
  }

  return path.join(root, "public", manifest.snapshotPath.slice(1));
}

function workerGzipSize(root) {
  const dryRunLog = process.env.CLOUDFLARE_DRY_RUN_LOG;

  if (dryRunLog && fs.existsSync(dryRunLog)) {
    const parsed = parseWranglerGzipBytes(fs.readFileSync(dryRunLog, "utf8"));

    if (parsed !== undefined) {
      return parsed;
    }
  }

  const handlerPath = path.join(root, ".open-next", "server-functions", "default", "handler.mjs");

  if (!fs.existsSync(handlerPath)) {
    return undefined;
  }

  return gzipSync(fs.readFileSync(handlerPath)).byteLength;
}

function workerStartupFiles(root) {
  const files = [];
  const workerPath = path.join(root, ".open-next", "worker.js");
  const ssrChunkDirectory = path.join(
    root,
    ".open-next",
    "server-functions",
    "default",
    ".next",
    "server",
    "chunks",
    "ssr",
  );

  if (fs.existsSync(workerPath)) {
    files.push(workerPath);
  }

  if (fs.existsSync(ssrChunkDirectory)) {
    for (const filename of fs.readdirSync(ssrChunkDirectory)) {
      if (filename.includes("root-of-the-server")) {
        files.push(path.join(ssrChunkDirectory, filename));
      }
    }
  }

  return files;
}

function findOpenNextCacheBuildDir(root) {
  const cacheRoot = path.join(root, ".open-next", "cache");

  if (!fs.existsSync(cacheRoot)) {
    throw new Error(".open-next/cache is missing; run npm run build:cf before the release gate.");
  }

  const buildDirs = fs
    .readdirSync(cacheRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(cacheRoot, entry.name));

  if (buildDirs.length !== 1) {
    throw new Error(`Expected exactly one OpenNext cache build directory, found ${buildDirs.length}.`);
  }

  return buildDirs[0];
}

function assertFileExists(root, relativePath) {
  const filePath = path.join(root, relativePath);

  if (!fs.existsSync(filePath)) {
    throw new Error(`${relativePath} is missing.`);
  }

  return filePath;
}

export function assertPrerenderAssetFastPath(root) {
  const requiredAssets = [
    ".open-next/assets/__opennext-prerender/index.html",
    ".open-next/assets/__opennext-prerender/index.rsc",
    ".open-next/assets/__opennext-prerender/updates.html",
    ".open-next/assets/__opennext-prerender/updates.rsc",
    ".open-next/assets/__opennext-prerender/categories.html",
    ".open-next/assets/__opennext-prerender/categories.rsc",
  ];

  for (const relativePath of requiredAssets) {
    assertFileExists(root, relativePath);
  }

  const workerSource = fs.readFileSync(
    assertFileExists(root, ".open-next/worker.js"),
    "utf8",
  );

  if (!workerSource.includes("x-devils-prerender-cache")) {
    throw new Error(".open-next/worker.js is missing the prerender asset fast path.");
  }

  return `Prerender asset fast path: ${requiredAssets.length} route assets and worker header present`;
}

export function assertWorkerStartupDoesNotEmbedWebSnapshot(root, webSnapshot) {
  const marker = webSnapshot.entries?.[0]?.title;
  const startupFiles = workerStartupFiles(root);

  if (!marker || startupFiles.length === 0) {
    return undefined;
  }

  const offenders = startupFiles.filter((filePath) =>
    fs.readFileSync(filePath, "utf8").includes(marker),
  );

  if (offenders.length > 0) {
    throw new Error(
      `Worker startup chunks embed web catalogue marker "${marker}" in ${offenders
        .map((filePath) => path.relative(root, filePath))
        .join(", ")}.`,
    );
  }

  return `Worker startup catalogue payload: lazy chunk (${startupFiles.length} startup files checked)`;
}

export function collectCloudflareReleaseGateResults({
  root = process.cwd(),
  budgets = defaultCloudflareReleaseBudgets,
} = {}) {
  const results = [];
  const webSnapshotPath = path.join(root, "src", "generated", "entries.web.generated.json");
  const monolithicDetailsPath = path.join(root, "src", "generated", "entry-details.generated.json");
  const detailShardDirectory = path.join(root, "src", "generated", "entry-details");
  const webSnapshot = readJson(webSnapshotPath);

  if (fs.existsSync(monolithicDetailsPath)) {
    throw new Error("src/generated/entry-details.generated.json must not exist; use detail shards.");
  }

  results.push(
    assertBudget(
      "Worker lazy web snapshot",
      fileSize(webSnapshotPath),
      budgets.webSnapshotBytes,
    ),
  );

  const startupCatalogueCheck = assertWorkerStartupDoesNotEmbedWebSnapshot(root, webSnapshot);
  if (startupCatalogueCheck) {
    results.push(startupCatalogueCheck);
  }

  results.push(
    assertBudget(
      "Updates RSC route payload",
      fileSize(assertFileExists(root, ".next/server/app/updates.rsc")),
      budgets.updatesRscBytes,
    ),
  );

  const openNextCacheDir = findOpenNextCacheBuildDir(root);

  results.push(
    assertBudget(
      "Updates OpenNext prerender cache",
      fileSize(path.join(openNextCacheDir, "updates.cache")),
      budgets.updatesOpenNextCacheBytes,
    ),
  );

  const categoryCacheDir = path.join(openNextCacheDir, "categories");

  if (fs.existsSync(categoryCacheDir)) {
    for (const cacheFile of fs
      .readdirSync(categoryCacheDir)
      .filter((file) => file.endsWith(".cache"))
      .sort()) {
      results.push(
        assertBudget(
          `Category OpenNext prerender cache ${cacheFile}`,
          fileSize(path.join(categoryCacheDir, cacheFile)),
          budgets.categoryOpenNextCacheBytes,
        ),
      );
    }
  }

  results.push(assertPrerenderAssetFastPath(root));

  results.push(
    assertBudget(
      "Browser search payload",
      fileSize(currentSearchIndexPath(root, webSnapshot)),
      budgets.searchIndexBytes,
    ),
  );

  const shardFiles = fs
    .readdirSync(detailShardDirectory)
    .filter((file) => file.endsWith(".json"))
    .sort();

  if (shardFiles.length === 0) {
    throw new Error("No entry detail shards were generated.");
  }

  for (const shardFile of shardFiles) {
    results.push(
      assertBudget(
        `Entry detail shard ${shardFile}`,
        fileSize(path.join(detailShardDirectory, shardFile)),
        budgets.detailShardBytes,
      ),
    );
  }

  results.push(
    assertBudget(
      "Mobile catalog snapshot",
      fileSize(currentMobileSnapshotPath(root)),
      budgets.mobileSnapshotBytes,
    ),
  );

  const workerGzipBytes = workerGzipSize(root);

  if (workerGzipBytes !== undefined) {
    results.push(assertBudget("Worker gzip bundle", workerGzipBytes, budgets.workerGzipBytes));
  }

  return results;
}

export function runCloudflareReleaseGate(options) {
  const results = collectCloudflareReleaseGateResults(options);

  for (const result of results) {
    console.log(result);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    runCloudflareReleaseGate();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
