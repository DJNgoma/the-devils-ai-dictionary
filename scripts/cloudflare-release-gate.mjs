import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { pathToFileURL } from "node:url";

export const defaultCloudflareReleaseBudgets = {
  // Absolute ceiling only: a hard safety net for Worker import cost.
  // Day-to-day growth is gated by resolveWebSnapshotBudget() so adding terms
  // does not require a one-off KiB bump every few dozen entries.
  webSnapshotBytesCeiling: 896 * 1024,
  // Fixed overhead for schedule/meta (dailyWordSlugs, publishedEntryBatches, …).
  webSnapshotMetaBytes: 48 * 1024,
  // Per-entry allowance after lazy strip + category interning + sparse defaults.
  // Current compact density is ~600 B/entry; leave margin for longer definitions.
  webSnapshotBytesPerEntry: 720,
  searchIndexBytes: 2 * 1024 * 1024,
  detailShardBytes: 160 * 1024,
  mobileSnapshotBytes: 5 * 1024 * 1024,
  workerGzipBytes: 2.8 * 1024 * 1024,
  // These are the static HTML/RSC assets actually served by the Worker fast
  // path. The larger OpenNext cache envelopes are build intermediates and are
  // not the deployed response payloads.
  prerenderHtmlBytes: 2 * 1024 * 1024,
  prerenderRscBytes: 1 * 1024 * 1024,
};

/**
 * Scale the lazy web snapshot budget with catalogue size.
 * Fails on per-entry regressions; grows automatically with term count until
 * the absolute ceiling forces a real architecture change (not a budget edit).
 */
export function resolveWebSnapshotBudget(
  entryCount,
  budgets = defaultCloudflareReleaseBudgets,
) {
  const count = Number.isFinite(entryCount) && entryCount > 0 ? entryCount : 0;
  const metaBytes = budgets.webSnapshotMetaBytes ?? 48 * 1024;
  const perEntry = budgets.webSnapshotBytesPerEntry ?? 720;
  const ceiling =
    budgets.webSnapshotBytesCeiling ??
    budgets.webSnapshotBytes ??
    896 * 1024;
  const scaled = metaBytes + count * perEntry;

  return Math.min(ceiling, scaled);
}

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

  const webSnapshotBytes = fileSize(webSnapshotPath);
  const webSnapshotBudget = resolveWebSnapshotBudget(webSnapshot.entryCount, budgets);

  results.push(
    assertBudget(
      `Worker lazy web snapshot (${webSnapshot.entryCount} entries)`,
      webSnapshotBytes,
      webSnapshotBudget,
    ),
  );

  const startupCatalogueCheck = assertWorkerStartupDoesNotEmbedWebSnapshot(root, webSnapshot);
  if (startupCatalogueCheck) {
    results.push(startupCatalogueCheck);
  }

  results.push(assertPrerenderAssetFastPath(root));

  const prerenderAssetDir = path.join(
    root,
    ".open-next",
    "assets",
    "__opennext-prerender",
  );
  const prerenderAssets = [
    path.join(prerenderAssetDir, "index.html"),
    path.join(prerenderAssetDir, "index.rsc"),
    path.join(prerenderAssetDir, "categories.html"),
    path.join(prerenderAssetDir, "categories.rsc"),
    path.join(prerenderAssetDir, "updates.html"),
    path.join(prerenderAssetDir, "updates.rsc"),
    ...fs
      .readdirSync(path.join(prerenderAssetDir, "categories"))
      .filter((file) => file.endsWith(".html") || file.endsWith(".rsc"))
      .sort()
      .map((file) => path.join(prerenderAssetDir, "categories", file)),
  ];

  for (const assetPath of prerenderAssets) {
    const extension = path.extname(assetPath);
    const budget =
      extension === ".html" ? budgets.prerenderHtmlBytes : budgets.prerenderRscBytes;

    results.push(
      assertBudget(
        `Prerender asset ${path.relative(prerenderAssetDir, assetPath)}`,
        fileSize(assetPath),
        budget,
      ),
    );
  }

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
