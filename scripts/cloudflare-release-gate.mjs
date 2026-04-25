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
      "Worker startup web snapshot",
      fileSize(webSnapshotPath),
      budgets.webSnapshotBytes,
    ),
  );

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
