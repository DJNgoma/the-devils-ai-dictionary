#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const queueFileRelativePath = "docs/automation/daily-term-queue.json";
const defaultQueueBatchSize = 7;
const minimumQueuedTerms = 5;
const validQueueStatuses = new Set(["queued", "published", "skipped"]);

const allowedPublishPathPatterns = [
  /^content\/entries\/[^/]+\.mdx$/,
  /^scripts\/daily-term-automation\.mjs$/,
  /^docs\/automation\/daily-term-queue\.json$/,
  /^src\/generated\/entries\.generated\.json$/,
  /^src\/generated\/entries\.web\.generated\.json$/,
  /^src\/generated\/entry-detail-shards\.generated\.ts$/,
  /^src\/generated\/entry-details\/[^/]+\.json$/,
  /^public\/catalog\/version\.json$/,
  /^public\/catalog\/catalog\.[a-f0-9]{64}\.json$/,
  /^public\/catalog\/search-index\.[a-f0-9]{64}\.json$/,
  /^public\/mobile-catalog\/manifest\.json$/,
  /^public\/mobile-catalog\/entries\.[a-f0-9]{64}\.json$/,
];

function usage() {
  console.error(`Usage:
  node scripts/daily-term-automation.mjs bootstrap --automation-root <path> [--json]
  node scripts/daily-term-automation.mjs prepare [--source-repo <path>] [--json]
  node scripts/daily-term-automation.mjs queue next [--count <n>] [--json]
  node scripts/daily-term-automation.mjs verify [slug ...] [--json]
  node scripts/daily-term-automation.mjs publish <slug ...> --message "<commit subject>" [--push] [--json]
`);
}

function parseArgs(argv) {
  const flags = new Set();
  const values = new Map();
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }

    const [flag, inlineValue] = arg.split("=", 2);
    if (inlineValue !== undefined) {
      values.set(flag, inlineValue);
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      values.set(flag, next);
      index += 1;
      continue;
    }

    flags.add(flag);
  }

  return { flags, values, positionals };
}

function run(command, args, { cwd, check = true } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
  });

  if (check && result.status !== 0) {
    const error = new Error(
      [
        `Command failed: ${command} ${args.join(" ")}`,
        result.stdout?.trim(),
        result.stderr?.trim(),
      ]
        .filter(Boolean)
        .join("\n"),
    );
    error.status = result.status;
    throw error;
  }

  return result;
}

function gitCommandArgs(args, { useGhCredentialHelper = false } = {}) {
  if (!useGhCredentialHelper) {
    return args;
  }

  const ghCommand = resolveGhCommand();
  if (!ghCommand) {
    return args;
  }

  return [
    "-c",
    "credential.helper=",
    "-c",
    `credential.helper=!${shellQuote(ghCommand)} auth git-credential`,
    ...args,
  ];
}

function gitWithOptions(repoRoot, args, { check = true, useGhCredentialHelper = false } = {}) {
  return run("git", gitCommandArgs(args, { useGhCredentialHelper }), {
    cwd: repoRoot,
    check,
  });
}

function git(repoRoot, ...args) {
  return gitWithOptions(repoRoot, args);
}

function gitWithResult(repoRoot, ...args) {
  return gitWithOptions(repoRoot, args, { check: false });
}

function resolveRepoRoot(startPath = process.cwd()) {
  return run("git", ["rev-parse", "--show-toplevel"], { cwd: startPath }).stdout.trim();
}

function parseStatusLine(line) {
  const indexStatus = line[0];
  const worktreeStatus = line[1];
  let file = line.slice(3).trim();

  if (file.includes(" -> ")) {
    const [, renamedTo] = file.split(" -> ");
    file = renamedTo;
  }

  return {
    indexStatus,
    worktreeStatus,
    file,
  };
}

function readStatus(repoRoot) {
  const output = git(repoRoot, "status", "--porcelain=v1", "--untracked-files=all").stdout;
  return output
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map(parseStatusLine);
}

function stageExistingPaths(repoRoot, paths, { force = false } = {}) {
  const existingPaths = paths.filter((candidate) => {
    if (existsSync(path.join(repoRoot, candidate))) {
      return true;
    }

    return git(repoRoot, "ls-files", "--", candidate).stdout.trim().length > 0;
  });

  if (existingPaths.length === 0) {
    return;
  }

  git(repoRoot, "add", ...(force ? ["-f"] : []), "--", ...existingPaths);
}

function isAllowedPublishPath(file) {
  return allowedPublishPathPatterns.some((pattern) => pattern.test(file));
}

function unique(values) {
  return [...new Set(values)];
}

function slugFromEntryPath(file) {
  if (!/^content\/entries\/[^/]+\.mdx$/.test(file)) {
    return null;
  }

  return path.basename(file, ".mdx");
}

function inferChangedSlugs(repoRoot) {
  return unique(
    readStatus(repoRoot)
      .map(({ file }) => slugFromEntryPath(file))
      .filter(Boolean),
  );
}

function buildDiagramCoverage(entries, slugs) {
  const entryBySlug = new Map(entries.map((entry) => [entry.slug, entry]));
  const withDiagram = [];
  const withoutDiagram = [];

  for (const slug of slugs) {
    const entry = entryBySlug.get(slug);
    if (entry?.diagram) {
      withDiagram.push({ slug, diagram: entry.diagram });
    } else {
      withoutDiagram.push(slug);
    }
  }

  return { withDiagram, withoutDiagram };
}

function buildMisunderstoodSelection(entries, slugs, misunderstoodSlugs) {
  const entryBySlug = new Map(entries.map((entry) => [entry.slug, entry]));
  const selectedSet = new Set(misunderstoodSlugs);

  return {
    selectedSlugs: misunderstoodSlugs,
    verifiedSlugs: slugs.map((slug) => {
      const entry = entryBySlug.get(slug);
      return {
        slug,
        misunderstoodScore: entry?.misunderstoodScore ?? null,
        selected: selectedSet.has(slug),
      };
    }),
  };
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function ensureFile(file, message) {
  try {
    await fs.access(file);
  } catch {
    throw new Error(message ?? `Expected file to exist: ${file}`);
  }
}

async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

function parsePositiveInteger(rawValue, { flagName, defaultValue } = {}) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw new Error(`${flagName ?? "value"} is required.`);
  }

  const parsed = Number.parseInt(String(rawValue), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flagName ?? "value"} must be a positive integer.`);
  }

  return parsed;
}

async function sha256File(file) {
  const contents = await fs.readFile(file);
  return createHash("sha256").update(contents).digest("hex");
}

async function copyDirectory(source, destination) {
  await fs.rm(destination, { recursive: true, force: true });

  const cloneResult = run("cp", ["-cR", source, destination], { check: false });
  if (cloneResult.status === 0) {
    return { copyMode: "clonefile" };
  }

  const recursiveResult = run("cp", ["-R", source, destination], { check: false });
  if (recursiveResult.status === 0) {
    return {
      copyMode: "recursive",
      warning: formatCommandFailure("cp", ["-cR", source, destination], cloneResult),
    };
  }

  throw new Error(
    [
      "Failed to copy directory for daily-term automation.",
      formatCommandFailure("cp", ["-cR", source, destination], cloneResult),
      formatCommandFailure("cp", ["-R", source, destination], recursiveResult),
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

async function hasNodeModulesSentinel(nodeModulesDirectory) {
  return fileExists(path.join(nodeModulesDirectory, "gray-matter", "package.json"));
}

async function loadQueueFile(repoRoot) {
  const queueFile = path.join(repoRoot, queueFileRelativePath);
  const queue = await readJson(queueFile);

  if (queue?.schemaVersion !== 1) {
    throw new Error(`Expected ${queueFileRelativePath} to declare schemaVersion 1.`);
  }

  if (!Array.isArray(queue.items)) {
    throw new Error(`Expected ${queueFileRelativePath} to contain an items array.`);
  }

  for (const item of queue.items) {
    if (typeof item?.slug !== "string" || item.slug.length === 0) {
      throw new Error(`Every queue item in ${queueFileRelativePath} must include a slug.`);
    }

    if (!validQueueStatuses.has(item.status)) {
      throw new Error(
        `Queue item "${item.slug}" has invalid status "${item.status}" in ${queueFileRelativePath}.`,
      );
    }
  }

  return { queue, queueFile };
}

function selectQueueItems(items, requestedCount = defaultQueueBatchSize) {
  const count = parsePositiveInteger(requestedCount, {
    flagName: "--count",
    defaultValue: defaultQueueBatchSize,
  });
  const queuedItems = items.filter((item) => item.status === "queued");

  if (queuedItems.length < minimumQueuedTerms) {
    throw new Error(
      [
        `Queue depleted: only ${queuedItems.length} queued term(s) remain in ${queueFileRelativePath}.`,
        `Add more items before the daily automation runs again. Minimum required: ${minimumQueuedTerms}.`,
      ].join("\n"),
    );
  }

  const selectedItems = queuedItems.slice(0, Math.min(count, queuedItems.length));

  return {
    requestedCount: count,
    queuedCount: queuedItems.length,
    selectedItems,
    lowQueueWarning: queuedItems.length < count,
    remainingQueuedAfterSelection: queuedItems.length - selectedItems.length,
  };
}

async function updateQueueItemsForPublish(repoRoot, slugs, publishedAt) {
  const { queue, queueFile } = await loadQueueFile(repoRoot);
  const queueItemsBySlug = new Map(queue.items.map((item) => [item.slug, item]));

  for (const slug of slugs) {
    const item = queueItemsBySlug.get(slug);
    if (!item) {
      throw new Error(
        `Queued publish slug "${slug}" does not exist in ${queueFileRelativePath}.`,
      );
    }

    if (item.status !== "queued") {
      throw new Error(
        `Queued publish slug "${slug}" has status "${item.status}" in ${queueFileRelativePath}; expected "queued".`,
      );
    }

    item.status = "published";
    item.publishedAt = publishedAt;
  }

  queue.updatedAt = publishedAt;
  await fs.writeFile(queueFile, `${JSON.stringify(queue, null, 2)}\n`, "utf8");
}

function sleepMs(durationMs) {
  if (durationMs <= 0) {
    return;
  }

  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, durationMs);
}

function formatCommandFailure(command, args, result) {
  return [
    `Command failed: ${command} ${args.join(" ")}`,
    result.stdout?.trim(),
    result.stderr?.trim(),
  ]
    .filter(Boolean)
    .join("\n");
}

let ghCommandCache;

function shellQuote(value) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function ghCommandCandidates() {
  return unique(
    [
      process.env.GH_PATH,
      "/opt/homebrew/bin/gh",
      "/usr/local/bin/gh",
      "gh",
      path.join(os.homedir(), ".local", "bin", "gh"),
      "/usr/bin/gh",
    ].filter(Boolean),
  );
}

function resolveGhCommand() {
  if (ghCommandCache !== undefined) {
    return ghCommandCache;
  }

  const explicitGhPath = process.env.GH_PATH;
  const candidates = explicitGhPath ? [explicitGhPath] : ghCommandCandidates();

  for (const candidate of candidates) {
    if (candidate !== "gh" && !existsSync(candidate)) {
      continue;
    }

    const result = spawnSync(candidate, ["--version"], {
      encoding: "utf8",
      stdio: "pipe",
    });

    if (result.status === 0) {
      ghCommandCache = candidate;
      return ghCommandCache;
    }
  }

  ghCommandCache = null;
  return ghCommandCache;
}

function toGithubHttpsUrl(remoteUrl) {
  if (!remoteUrl) {
    return null;
  }

  const scpLikeMatch = remoteUrl.match(/^git@github\.com:(.+)$/);
  if (scpLikeMatch) {
    return `https://github.com/${scpLikeMatch[1]}`;
  }

  const sshUrlMatch = remoteUrl.match(/^ssh:\/\/git@github\.com\/(.+)$/);
  if (sshUrlMatch) {
    return `https://github.com/${sshUrlMatch[1]}`;
  }

  const httpsMatch = remoteUrl.match(/^https?:\/\/github\.com\/(.+)$/);
  if (httpsMatch) {
    return `https://github.com/${httpsMatch[1]}`;
  }

  return null;
}

function resolveAutomationRemote(originUrl) {
  const githubHttpsUrl = toGithubHttpsUrl(originUrl);

  if (githubHttpsUrl) {
    const ghCommand = resolveGhCommand();

    if (ghCommand) {
      return {
        fetchTarget: githubHttpsUrl,
        pushTarget: githubHttpsUrl,
        useGhCredentialHelper: true,
        transport: "https-gh",
      };
    }

    if (process.env.GH_PATH) {
      throw new Error(
        `GH_PATH is set to "${process.env.GH_PATH}", but that gh command is not usable. Fix GH_PATH or unset it before running daily-term automation.`,
      );
    }
  }

  return {
    fetchTarget: "origin",
    pushTarget: "origin",
    useGhCredentialHelper: false,
    transport: "native",
  };
}

function resolveSourceOriginMainRef() {
  return "refs/remotes/origin/main";
}

function resolveCommit(repoRoot, ref) {
  const result = gitWithResult(repoRoot, "rev-parse", "--verify", `${ref}^{commit}`);
  if (result.status !== 0) {
    return null;
  }

  return result.stdout.trim();
}

function describeOriginMainFetch(remote) {
  if (remote.fetchTarget === "origin") {
    return "git fetch origin main";
  }

  return `git fetch ${remote.fetchTarget} main:${resolveSourceOriginMainRef()}`;
}

function buildOriginMainFetchArgs(remote) {
  if (remote.fetchTarget === "origin") {
    return ["fetch", "origin", "main"];
  }

  return ["fetch", remote.fetchTarget, `main:${resolveSourceOriginMainRef()}`];
}

function refreshSourceOriginMain(sourceRepo, remote, {
  attempts = 3,
  retryDelayMs = [1000, 2000, 4000],
} = {}) {
  const fetchArgs = buildOriginMainFetchArgs(remote);
  let lastFailure = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const result = gitWithOptions(sourceRepo, fetchArgs, {
      check: false,
      useGhCredentialHelper: remote.useGhCredentialHelper,
    });

    if (result.status === 0) {
      return {
        status: "fresh",
        attempts: attempt + 1,
        warnings: [],
        fetchDescription: describeOriginMainFetch(remote),
      };
    }

    lastFailure = formatCommandFailure("git", fetchArgs, result);

    if (attempt < attempts - 1) {
      sleepMs(retryDelayMs[attempt] ?? retryDelayMs.at(-1) ?? 0);
    }
  }

  return {
    status: "failed",
    attempts,
    warnings: [],
    lastFailure,
    fetchDescription: describeOriginMainFetch(remote),
  };
}

function resolvePrepareBase(sourceRepo, refreshResult) {
  const baseRef = resolveSourceOriginMainRef();
  const baseCommit = resolveCommit(sourceRepo, baseRef);

  if (refreshResult.status === "fresh") {
    if (!baseCommit) {
      throw new Error(`Expected ${baseRef} to exist after refreshing origin/main.`);
    }

    return {
      originFetchStatus: "fresh",
      baseRef,
      baseCommit,
      warnings: [],
    };
  }

  if (!baseCommit) {
    throw new Error(
      [
        `Failed to refresh origin/main after ${refreshResult.attempts} attempts and no cached ${baseRef} exists in the source repo.`,
        refreshResult.lastFailure,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return {
    originFetchStatus: "cached",
    baseRef,
    baseCommit,
    warnings: [
      [
        `${refreshResult.fetchDescription} failed after ${refreshResult.attempts} attempts; using cached ${baseRef} from the source repo.`,
        refreshResult.lastFailure,
      ]
        .filter(Boolean)
        .join("\n"),
    ],
  };
}

function seedScratchRepoFromSourceRef(scratchRepo, sourceRepo, sourceRef) {
  const scratchFetchRef = "refs/remotes/source-cache/origin-main";

  run("git", ["init", scratchRepo]);
  git(scratchRepo, "remote", "add", "origin", git(sourceRepo, "remote", "get-url", "origin").stdout.trim());
  run(
    "git",
    ["fetch", "--no-tags", sourceRepo, `${sourceRef}:${scratchFetchRef}`],
    { cwd: scratchRepo },
  );
  git(scratchRepo, "checkout", "-B", "automation/daily-term-expansion", scratchFetchRef);
}

async function commandPrepare(options) {
  const sourceRepo = path.resolve(options.values.get("--source-repo") ?? resolveRepoRoot());
  const originUrl = git(sourceRepo, "remote", "get-url", "origin").stdout.trim();
  const automationRemote = resolveAutomationRemote(originUrl);
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}`;
  const scratchBase = path.join(os.tmpdir(), "devils-ai-dictionary-daily-term-expansion");
  const scratchRepo = path.join(scratchBase, runId);
  const sourceNodeModules = path.join(sourceRepo, "node_modules");
  const scratchNodeModules = path.join(scratchRepo, "node_modules");

  await fs.mkdir(scratchBase, { recursive: true });

  let prepared = false;
  let copiedNodeModules = false;
  const refreshResult = refreshSourceOriginMain(sourceRepo, automationRemote);
  const prepareBase = resolvePrepareBase(sourceRepo, refreshResult);

  try {
    seedScratchRepoFromSourceRef(scratchRepo, sourceRepo, prepareBase.baseRef);
    git(scratchRepo, "remote", "set-url", "origin", originUrl);

    if (await fileExists(sourceNodeModules)) {
      const copyResult = run("cp", ["-cR", sourceNodeModules, scratchNodeModules], {
        check: false,
      });

      if (copyResult.status === 0) {
        copiedNodeModules = true;
      }
    }

    const status = readStatus(scratchRepo);
    if (status.length > 0) {
      throw new Error("Scratch checkout was not clean after prepare.");
    }

    prepared = true;

    const result = {
      workspace: scratchRepo,
      branch: git(scratchRepo, "branch", "--show-current").stdout.trim(),
      head: git(scratchRepo, "rev-parse", "HEAD").stdout.trim(),
      originFetchStatus: prepareBase.originFetchStatus,
      baseRef: prepareBase.baseRef,
      baseCommit: prepareBase.baseCommit,
      originUrl,
      automationOriginUrl:
        automationRemote.fetchTarget === "origin" ? originUrl : automationRemote.fetchTarget,
      gitTransport: automationRemote.transport,
      copiedNodeModules,
      warnings: prepareBase.warnings,
    };

    if (options.flags.has("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`Workspace: ${result.workspace}`);
    console.log(`Branch: ${result.branch}`);
    console.log(`Base: ${result.baseRef} @ ${result.baseCommit} (${result.originFetchStatus})`);
    for (const warning of result.warnings) {
      console.warn(warning);
    }
  } finally {
    if (!prepared) {
      await fs.rm(scratchRepo, { recursive: true, force: true });
    }
  }
}

async function commandBootstrap(options) {
  const repoRoot = resolveRepoRoot();
  const automationRoot = options.values.get("--automation-root") ?? process.env.DAILY_TERM_AUTOMATION_ROOT;

  if (!automationRoot) {
    throw new Error("bootstrap requires --automation-root <path> or DAILY_TERM_AUTOMATION_ROOT.");
  }

  const resolvedAutomationRoot = path.resolve(automationRoot);
  const lockfilePath = path.join(repoRoot, "package-lock.json");
  await ensureFile(lockfilePath, "bootstrap requires package-lock.json in the automation workspace.");

  const lockfileHash = await sha256File(lockfilePath);
  const nodeModulesDirectory = path.join(repoRoot, "node_modules");
  const cacheDirectory = path.join(
    resolvedAutomationRoot,
    "node_modules-cache",
    lockfileHash,
  );

  await fs.mkdir(path.dirname(cacheDirectory), { recursive: true });

  const warnings = [];
  let dependencyCacheStatus = "existing";
  let copyMode = null;

  if (!(await hasNodeModulesSentinel(nodeModulesDirectory))) {
    if (await hasNodeModulesSentinel(cacheDirectory)) {
      const copyResult = await copyDirectory(cacheDirectory, nodeModulesDirectory);
      dependencyCacheStatus = "restored";
      copyMode = copyResult.copyMode;
      if (copyResult.warning) {
        warnings.push(copyResult.warning);
      }
    } else {
      run("bash", ["scripts/with-node.sh", "npm", "ci"], { cwd: repoRoot });

      const stagingCacheDirectory = `${cacheDirectory}.tmp-${process.pid}-${Date.now()}`;
      const copyResult = await copyDirectory(nodeModulesDirectory, stagingCacheDirectory);
      copyMode = copyResult.copyMode;
      if (copyResult.warning) {
        warnings.push(copyResult.warning);
      }

      try {
        await fs.rename(stagingCacheDirectory, cacheDirectory);
      } catch (error) {
        if (error?.code === "EEXIST") {
          await fs.rm(stagingCacheDirectory, { recursive: true, force: true });
        } else {
          throw error;
        }
      }

      dependencyCacheStatus = "built";
    }
  }

  if (!(await hasNodeModulesSentinel(nodeModulesDirectory))) {
    throw new Error("bootstrap could not prepare a usable node_modules tree for verification.");
  }

  const result = {
    workspace: repoRoot,
    lockfileHash,
    dependencyCacheStatus,
    cacheDirectory,
    copyMode,
    warnings,
  };

  if (options.flags.has("--json")) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Workspace: ${result.workspace}`);
  console.log(`Dependency cache: ${dependencyCacheStatus}`);
  console.log(`Lockfile hash: ${lockfileHash}`);
  for (const warning of warnings) {
    console.warn(warning);
  }
}

async function commandQueue(options) {
  const repoRoot = resolveRepoRoot();
  const [subcommand] = options.positionals;

  if (subcommand !== "next") {
    throw new Error('queue requires the "next" subcommand.');
  }

  const requestedCount = parsePositiveInteger(options.values.get("--count"), {
    flagName: "--count",
    defaultValue: defaultQueueBatchSize,
  });
  const { queue } = await loadQueueFile(repoRoot);
  const selection = selectQueueItems(queue.items, requestedCount);

  const result = {
    requestedCount: selection.requestedCount,
    queuedCount: selection.queuedCount,
    selectedCount: selection.selectedItems.length,
    lowQueueWarning: selection.lowQueueWarning,
    remainingQueuedAfterSelection: selection.remainingQueuedAfterSelection,
    items: selection.selectedItems,
  };

  if (options.flags.has("--json")) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(
    `Selected ${result.selectedCount} queued term(s): ${selection.selectedItems
      .map((item) => item.slug)
      .join(", ")}`,
  );
  if (selection.lowQueueWarning) {
    console.warn(
      `Queue running low: only ${selection.queuedCount} queued term(s) were available.`,
    );
  }
}

async function commandVerify(options) {
  const repoRoot = resolveRepoRoot();
  const requestedSlugs = unique(options.positionals);
  const slugs = requestedSlugs.length > 0 ? requestedSlugs : inferChangedSlugs(repoRoot);

  if (slugs.length === 0) {
    throw new Error("No slugs were supplied and no changed entry files were detected.");
  }

  for (const slug of slugs) {
    await ensureFile(
      path.join(repoRoot, "content", "entries", `${slug}.mdx`),
      `Missing expected entry file for slug "${slug}".`,
    );
  }

  run("bash", ["scripts/build-content-artifacts.sh"], { cwd: repoRoot });

  const generatedSnapshot = await readJson(
    path.join(repoRoot, "src", "generated", "entries.generated.json"),
  );
  const generatedSlugSet = new Set(generatedSnapshot.entries.map((entry) => entry.slug));

  for (const slug of slugs) {
    if (!generatedSlugSet.has(slug)) {
      throw new Error(`Generated snapshot is missing slug "${slug}".`);
    }
  }

  const diagramCoverage = buildDiagramCoverage(generatedSnapshot.entries, slugs);
  const misunderstoodSelection = buildMisunderstoodSelection(
    generatedSnapshot.entries,
    slugs,
    generatedSnapshot.misunderstoodSlugs ?? [],
  );

  const versionManifest = await readJson(path.join(repoRoot, "public", "catalog", "version.json"));

  if (!/^\/catalog\/catalog\.[a-f0-9]{64}\.json$/.test(versionManifest.path)) {
    throw new Error(`Unexpected catalog manifest path "${versionManifest.path}".`);
  }

  if (versionManifest.version !== generatedSnapshot.catalogVersion) {
    throw new Error("public/catalog/version.json does not match the generated snapshot version.");
  }

  const publishedCatalogFile = path.join(repoRoot, "public", versionManifest.path.replace(/^\//, ""));
  await ensureFile(
    publishedCatalogFile,
    `Catalog manifest points at a missing file: ${publishedCatalogFile}`,
  );

  const publishedCatalog = await readJson(publishedCatalogFile);
  const publishedSlugSet = new Set(publishedCatalog.entries.map((entry) => entry.slug));

  if (publishedCatalog.catalogVersion !== generatedSnapshot.catalogVersion) {
    throw new Error("Versioned public catalog does not match the generated snapshot version.");
  }

  for (const slug of slugs) {
    if (!publishedSlugSet.has(slug)) {
      throw new Error(`Versioned public catalog is missing slug "${slug}".`);
    }
  }

  const mobileManifestFile = path.join(repoRoot, "public", "mobile-catalog", "manifest.json");
  await ensureFile(mobileManifestFile, "Mobile catalog manifest was not generated.");
  const mobileManifest = await readJson(mobileManifestFile);
  const mobileSnapshotFile = path.join(repoRoot, "public", mobileManifest.snapshotPath.replace(/^\//, ""));
  await ensureFile(
    mobileSnapshotFile,
    `Mobile catalog manifest points at a missing snapshot: ${mobileSnapshotFile}`,
  );

  const mobileSnapshot = await readJson(mobileSnapshotFile);
  const mobileSlugSet = new Set(mobileSnapshot.entries.map((entry) => entry.slug));

  if (mobileManifest.catalogVersion !== generatedSnapshot.catalogVersion) {
    throw new Error("Mobile catalog manifest does not match the generated snapshot version.");
  }

  if (mobileSnapshot.catalogVersion !== generatedSnapshot.catalogVersion) {
    throw new Error("Mobile catalog snapshot does not match the generated snapshot version.");
  }

  for (const slug of slugs) {
    if (!mobileSlugSet.has(slug)) {
      throw new Error(`Mobile catalog snapshot is missing slug "${slug}".`);
    }
  }

  const fullChecksAvailable = await fileExists(
    path.join(repoRoot, "node_modules", "gray-matter", "package.json"),
  );

  if (!fullChecksAvailable) {
    throw new Error(
      "Full verification is blocked because node_modules is unavailable in this scratch checkout.",
    );
  }

  run("bash", ["scripts/with-node.sh", "npm", "run", "lint"], { cwd: repoRoot });
  run("bash", ["scripts/with-node.sh", "npm", "run", "typecheck"], { cwd: repoRoot });
  run("bash", ["scripts/with-node.sh", "npm", "run", "build"], { cwd: repoRoot });

  const result = {
    verifiedSlugs: slugs,
    diagramCoverage,
    misunderstoodSelection,
    catalogVersion: generatedSnapshot.catalogVersion,
    publicCatalogPath: versionManifest.path,
    mobileCatalogPath: mobileManifest.snapshotPath,
    fullChecksRan: fullChecksAvailable,
  };

  if (options.flags.has("--json")) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Verified slugs: ${slugs.join(", ")}`);
  if (diagramCoverage.withDiagram.length > 0) {
    console.log(
      `Diagram coverage: ${diagramCoverage.withDiagram
        .map(({ slug, diagram }) => `${slug}=${diagram}`)
        .join(", ")}`,
    );
  }
  if (diagramCoverage.withoutDiagram.length > 0) {
    console.warn(
      `Diagram review needed: no diagram set for ${diagramCoverage.withoutDiagram.join(", ")}`,
    );
  }
  console.log(
    `Most misunderstood: ${misunderstoodSelection.selectedSlugs.join(", ")}`,
  );
  console.log(`Catalog version: ${generatedSnapshot.catalogVersion}`);
  console.log(`Public catalog: ${versionManifest.path}`);
  console.log(`Mobile catalog: ${mobileManifest.snapshotPath}`);
}

async function commandPublish(options) {
  const repoRoot = resolveRepoRoot();
  const commitMessage = options.values.get("--message");
  const expectedSlugs = unique(options.positionals);
  const originUrl = git(repoRoot, "remote", "get-url", "origin").stdout.trim();
  const automationRemote = resolveAutomationRemote(originUrl);

  if (!commitMessage) {
    throw new Error("publish requires --message \"<commit subject>\".");
  }

  if (expectedSlugs.length === 0) {
    throw new Error("publish requires at least one expected slug argument.");
  }

  const currentBranch = git(repoRoot, "branch", "--show-current").stdout.trim();
  if (currentBranch === "main") {
    throw new Error(
      "publish must run from an isolated automation workspace, not directly from main.",
    );
  }

  const changes = readStatus(repoRoot);
  if (changes.length === 0) {
    throw new Error("There are no changes to publish.");
  }

  const unexpectedChanges = changes.filter(({ file }) => !isAllowedPublishPath(file));
  if (unexpectedChanges.length > 0) {
    throw new Error(
      `Refusing to publish unexpected paths:\n${unexpectedChanges.map(({ file }) => file).join("\n")}`,
    );
  }

  const changedSlugs = inferChangedSlugs(repoRoot);
  if (changedSlugs.length !== expectedSlugs.length
      || changedSlugs.some((slug) => !expectedSlugs.includes(slug))
      || expectedSlugs.some((slug) => !changedSlugs.includes(slug))) {
    throw new Error(
      [
        "Changed entry slugs do not match the publish arguments.",
        `Expected: ${expectedSlugs.join(", ")}`,
        `Detected: ${changedSlugs.join(", ") || "(none)"}`,
      ].join("\n"),
    );
  }

  const publishTimestamp = new Date().toISOString();
  await updateQueueItemsForPublish(repoRoot, expectedSlugs, publishTimestamp);

  stageExistingPaths(repoRoot, [
    "content/entries",
    "scripts/daily-term-automation.mjs",
    queueFileRelativePath,
    "src/generated/entries.generated.json",
    "src/generated/entries.web.generated.json",
    "src/generated/entry-detail-shards.generated.ts",
    "src/generated/entry-details",
    "public/catalog",
  ]);
  stageExistingPaths(repoRoot, ["public/mobile-catalog"], { force: true });

  const stagedStatus = readStatus(repoRoot);
  const unstagedChanges = stagedStatus.filter(
    ({ indexStatus, worktreeStatus }) => worktreeStatus !== " " || indexStatus === "?",
  );

  if (unstagedChanges.length > 0) {
    throw new Error(
      `Refusing to publish with unstaged changes still present:\n${unstagedChanges
        .map(({ file }) => file)
        .join("\n")}`,
    );
  }

  git(repoRoot, "commit", "-m", commitMessage);

  if (options.flags.has("--push")) {
    gitWithOptions(repoRoot, buildOriginMainFetchArgs(automationRemote), {
      useGhCredentialHelper: automationRemote.useGhCredentialHelper,
    });

    const ancestorCheck = run(
      "git",
      ["merge-base", "--is-ancestor", "origin/main", "HEAD"],
      { cwd: repoRoot, check: false },
    );

    if (ancestorCheck.status !== 0) {
      throw new Error(
        "origin/main moved after this run started; refusing to push a potentially stale branch.",
      );
    }

    gitWithOptions(repoRoot, ["push", automationRemote.pushTarget, "HEAD:main"], {
      useGhCredentialHelper: automationRemote.useGhCredentialHelper,
    });
  }

  const head = git(repoRoot, "rev-parse", "HEAD").stdout.trim();
  const result = {
    branch: currentBranch || null,
    head,
    pushed: options.flags.has("--push"),
    changedSlugs,
    gitTransport: automationRemote.transport,
  };

  if (options.flags.has("--json")) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Committed ${head} on ${currentBranch}`);
  console.log(`Changed slugs: ${changedSlugs.join(", ")}`);
  console.log(options.flags.has("--push") ? "Push: completed" : "Push: skipped");
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);

  if (!command) {
    usage();
    process.exit(64);
  }

  const options = parseArgs(rest);

  switch (command) {
    case "bootstrap":
      await commandBootstrap(options);
      return;
    case "prepare":
      await commandPrepare(options);
      return;
    case "queue":
      await commandQueue(options);
      return;
    case "verify":
      await commandVerify(options);
      return;
    case "publish":
      await commandPublish(options);
      return;
    default:
      usage();
      process.exit(64);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

export {
  buildDiagramCoverage,
  buildMisunderstoodSelection,
  ghCommandCandidates,
  gitCommandArgs,
  isAllowedPublishPath,
  loadQueueFile,
  resolveAutomationRemote,
  resolveGhCommand,
  selectQueueItems,
  sha256File,
  toGithubHttpsUrl,
};
