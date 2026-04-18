#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const allowedPublishPathPatterns = [
  /^content\/entries\/[^/]+\.mdx$/,
  /^src\/generated\/entries\.generated\.json$/,
  /^public\/catalog\/version\.json$/,
  /^public\/catalog\/catalog\.[a-f0-9]{64}\.json$/,
];

function usage() {
  console.error(`Usage:
  node scripts/daily-term-automation.mjs prepare [--source-repo <path>] [--json]
  node scripts/daily-term-automation.mjs verify [slug ...] [--json]
  node scripts/daily-term-automation.mjs publish --message "<commit subject>" [--push] [--json]
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

function git(repoRoot, ...args) {
  return run("git", args, { cwd: repoRoot });
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

async function commandPrepare(options) {
  const sourceRepo = path.resolve(options.values.get("--source-repo") ?? resolveRepoRoot());
  const originUrl = git(sourceRepo, "remote", "get-url", "origin").stdout.trim();
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}`;
  const scratchBase = path.join(os.tmpdir(), "devils-ai-dictionary-daily-term-expansion");
  const scratchRepo = path.join(scratchBase, runId);
  const sourceNodeModules = path.join(sourceRepo, "node_modules");
  const scratchNodeModules = path.join(scratchRepo, "node_modules");

  await fs.mkdir(scratchBase, { recursive: true });

  let prepared = false;
  let copiedNodeModules = false;

  try {
    run("git", ["clone", "--no-local", "--branch", "main", "--single-branch", sourceRepo, scratchRepo]);
    git(scratchRepo, "remote", "set-url", "origin", originUrl);
    git(scratchRepo, "fetch", "origin", "main");
    git(scratchRepo, "checkout", "-B", "automation/daily-term-expansion", "origin/main");

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
      baseRef: "origin/main",
      originUrl,
      copiedNodeModules,
    };

    if (options.flags.has("--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`Workspace: ${result.workspace}`);
    console.log(`Branch: ${result.branch}`);
    console.log(`Base: ${result.baseRef} @ ${result.head}`);
  } finally {
    if (!prepared) {
      await fs.rm(scratchRepo, { recursive: true, force: true });
    }
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
  console.log(`Catalog version: ${generatedSnapshot.catalogVersion}`);
  console.log(`Public catalog: ${versionManifest.path}`);
  console.log(`Mobile catalog: ${mobileManifest.snapshotPath}`);
}

async function commandPublish(options) {
  const repoRoot = resolveRepoRoot();
  const commitMessage = options.values.get("--message");

  if (!commitMessage) {
    throw new Error("publish requires --message \"<commit subject>\".");
  }

  const currentBranch = git(repoRoot, "branch", "--show-current").stdout.trim();
  if (!currentBranch || currentBranch === "main") {
    throw new Error(
      "publish must run from the isolated automation branch, not directly from main.",
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
  if (changedSlugs.length === 0) {
    throw new Error("No changed entry files were detected.");
  }

  git(repoRoot, "add", "--", "content/entries", "src/generated/entries.generated.json", "public/catalog");

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
    git(repoRoot, "fetch", "origin", "main");

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

    git(repoRoot, "push", "origin", "HEAD:main");
  }

  const head = git(repoRoot, "rev-parse", "HEAD").stdout.trim();
  const result = {
    branch: currentBranch,
    head,
    pushed: options.flags.has("--push"),
    changedSlugs,
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
    case "prepare":
      await commandPrepare(options);
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

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
