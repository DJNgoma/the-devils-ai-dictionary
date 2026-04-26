import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const automationScript = path.resolve(
  __dirname,
  "../../scripts/daily-term-automation.mjs",
);
const automationBootstrapScript = path.join(
  os.homedir(),
  ".codex",
  "automations",
  "the-devil-s-ai-dictionary-daily-term-expansion",
  "bootstrap.sh",
);

const tempPaths: string[] = [];
const persistentChildPids: number[] = [];
const originalGhPath = process.env.GH_PATH;
const originalHome = process.env.HOME;
const originalPath = process.env.PATH;

afterEach(() => {
  while (tempPaths.length > 0) {
    const target = tempPaths.pop();
    if (target) {
      fs.rmSync(target, { recursive: true, force: true });
    }
  }

  while (persistentChildPids.length > 0) {
    const pid = persistentChildPids.pop();
    if (pid) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // Ignore children that have already exited.
      }
    }
  }

  if (originalGhPath === undefined) {
    delete process.env.GH_PATH;
  } else {
    process.env.GH_PATH = originalGhPath;
  }

  if (originalHome === undefined) {
    delete process.env.HOME;
  } else {
    process.env.HOME = originalHome;
  }

  if (originalPath === undefined) {
    delete process.env.PATH;
  } else {
    process.env.PATH = originalPath;
  }
});

function trackTempPath(target: string) {
  tempPaths.push(target);
  return target;
}

function createTempDir(prefix: string) {
  return trackTempPath(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
}

function spawnPersistentProcess() {
  const child = spawn(
    process.execPath,
    ["-e", "setInterval(() => {}, 60_000)"],
    { detached: true, stdio: "ignore" },
  );
  child.unref();

  if (!child.pid) {
    throw new Error("Failed to start a persistent child process for lockfile tests.");
  }

  persistentChildPids.push(child.pid);
  return child.pid;
}

function formatFailure(command: string, args: string[], result: ReturnType<typeof spawnSync>) {
  return [
    `Command failed: ${command} ${args.join(" ")}`,
    typeof result.stdout === "string" ? result.stdout.trim() : undefined,
    typeof result.stderr === "string" ? result.stderr.trim() : undefined,
  ]
    .filter(Boolean)
    .join("\n");
}

function runCommand(
  command: string,
  args: string[],
  {
    check = true,
    cwd,
    env,
  }: {
    check?: boolean;
    cwd?: string;
    env?: Partial<NodeJS.ProcessEnv>;
  } = {},
) {
  const result = spawnSync(command, args, {
    cwd,
    env: env ? { ...process.env, ...env } : process.env,
    encoding: "utf8",
    stdio: "pipe",
  });

  if (check && result.status !== 0) {
    throw new Error(formatFailure(command, args, result));
  }

  return result;
}

function git(repoRoot: string, ...args: string[]) {
  return runCommand("git", args, { cwd: repoRoot });
}

function gitNoCheck(repoRoot: string, ...args: string[]) {
  return runCommand("git", args, { cwd: repoRoot, check: false });
}

function configureGitUser(repoRoot: string) {
  git(repoRoot, "config", "user.name", "Codex Test");
  git(repoRoot, "config", "user.email", "codex@example.com");
}

function checkoutAutomationBranch(repoRoot: string, branchName = "automation/test") {
  git(repoRoot, "checkout", "-b", branchName);
}

function writeFile(file: string, contents: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents, "utf8");
}

function buildQueueItems(slugs: string[]) {
  return slugs.map((slug, index) => ({
    slug,
    label: slug
      .split("-")
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(" "),
    status: "queued",
    notes: `Queue test item ${slug}`,
    diagramHint: null,
    misunderstoodHint: 3 + (index % 2),
    categoryHints: ["Core concepts"],
    relatedHints: ["test-term"],
    addedAt: "2026-04-26T07:00:00.000Z",
    publishedAt: null,
  }));
}

function writeQueueFile(repoRoot: string, slugs: string[]) {
  writeFile(
    path.join(repoRoot, "docs", "automation", "daily-term-queue.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        updatedAt: "2026-04-26T07:00:00.000Z",
        items: buildQueueItems(slugs),
      },
      null,
      2,
    )}\n`,
  );
}

function createSourceFixture() {
  const root = createTempDir("daily-term-automation-fixture-");
  const remoteRepo = path.join(root, "remote.git");
  const seedRepo = path.join(root, "seed");
  const sourceRepo = path.join(root, "source");

  runCommand("git", ["init", "--bare", remoteRepo]);
  runCommand("git", ["init", "-b", "main", seedRepo]);
  configureGitUser(seedRepo);

  writeFile(
    path.join(seedRepo, "content", "entries", "test-term.mdx"),
    [
      "---",
      'title: "Test Term"',
      'slug: "test-term"',
      'letter: "T"',
      "categories:",
      '  - "Core concepts"',
      'publishedAt: "2026-04-01"',
      'updatedAt: "2026-04-01"',
      "---",
      "",
      "A placeholder term for automation tests.",
      "",
    ].join("\n"),
  );
  writeFile(
    path.join(seedRepo, "scripts", "daily-term-automation.mjs"),
    [
      "#!/usr/bin/env node",
      "console.error('fixture placeholder: older repo script without bootstrap support');",
      "process.exit(1);",
      "",
    ].join("\n"),
  );
  writeFile(path.join(seedRepo, "README.md"), "# Daily term automation fixture\n");
  writeFile(
    path.join(seedRepo, "src", "generated", "entries.generated.json"),
    `${JSON.stringify({ entries: [{ slug: "test-term" }] }, null, 2)}\n`,
  );
  writeFile(
    path.join(seedRepo, "src", "generated", "entries.web.generated.json"),
    `${JSON.stringify({ entries: [{ slug: "test-term" }] }, null, 2)}\n`,
  );
  writeFile(
    path.join(seedRepo, "src", "generated", "entry-detail-shards.generated.ts"),
    "export const entryDetailShardLoaders = { t: () => import('./entry-details/t.json') } as const;\n",
  );
  writeFile(
    path.join(seedRepo, "src", "generated", "entry-details", "t.json"),
    `${JSON.stringify({ "test-term": { body: "A placeholder term for automation tests." } }, null, 2)}\n`,
  );
  writeFile(
    path.join(seedRepo, "public", "catalog", "version.json"),
    `${JSON.stringify(
      {
        version: "a".repeat(64),
        generatedAt: "2026-04-01T00:00:00.000Z",
        path: `/catalog/catalog.${"a".repeat(64)}.json`,
      },
      null,
      2,
    )}\n`,
  );
  writeFile(
    path.join(seedRepo, "public", "catalog", `catalog.${"a".repeat(64)}.json`),
    `${JSON.stringify({ entries: [{ slug: "test-term" }] }, null, 2)}\n`,
  );
  writeFile(
    path.join(seedRepo, "public", "catalog", `search-index.${"a".repeat(64)}.json`),
    `${JSON.stringify({ entries: [{ slug: "test-term" }] }, null, 2)}\n`,
  );
  writeFile(
    path.join(seedRepo, "public", "mobile-catalog", "manifest.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        catalogVersion: "a".repeat(64),
        publishedAt: "2026-04-01T00:00:00.000Z",
        snapshotPath: `/mobile-catalog/entries.${"a".repeat(64)}.json`,
      },
      null,
      2,
    )}\n`,
  );
  writeFile(
    path.join(seedRepo, "public", "mobile-catalog", `entries.${"a".repeat(64)}.json`),
    `${JSON.stringify({ entries: [{ slug: "test-term" }], catalogVersion: "a".repeat(64) }, null, 2)}\n`,
  );
  writeQueueFile(seedRepo, ["test-term", "queue-two", "queue-three", "queue-four", "queue-five", "queue-six", "queue-seven"]);

  git(seedRepo, "add", ".");
  git(seedRepo, "commit", "-m", "Seed the test dictionary");
  git(seedRepo, "remote", "add", "origin", remoteRepo);
  git(seedRepo, "push", "-u", "origin", "main");
  runCommand("git", ["--git-dir", remoteRepo, "symbolic-ref", "HEAD", "refs/heads/main"]);

  runCommand("git", ["clone", "--branch", "main", remoteRepo, sourceRepo]);
  configureGitUser(sourceRepo);

  return { remoteRepo, root, sourceRepo };
}

function advanceRemote(remoteRepo: string) {
  const advancerRepo = createTempDir("daily-term-automation-advance-");

  runCommand("git", ["clone", "--branch", "main", remoteRepo, advancerRepo]);
  configureGitUser(advancerRepo);
  writeFile(
    path.join(advancerRepo, "README.md"),
    `# Advanced at ${new Date().toISOString()}\n`,
  );
  git(advancerRepo, "add", "README.md");
  git(advancerRepo, "commit", "-m", "Advance the remote branch");
  git(advancerRepo, "push", "origin", "main");

  return git(advancerRepo, "rev-parse", "HEAD").stdout.trim();
}

function moveRemoteOffline(remoteRepo: string) {
  const offlineRepo = `${remoteRepo}.offline`;
  fs.renameSync(remoteRepo, offlineRepo);
  return offlineRepo;
}

function restoreRemote(remoteRepo: string, offlineRepo: string) {
  fs.renameSync(offlineRepo, remoteRepo);
}

function runAutomation(
  args: string[],
  { check = true, cwd, env }: { check?: boolean; cwd: string; env?: NodeJS.ProcessEnv },
) {
  return runCommand(process.execPath, [automationScript, ...args], { check, cwd, env });
}

function runBootstrap(
  args: string[],
  { check = true, cwd, env }: { check?: boolean; cwd: string; env?: Partial<NodeJS.ProcessEnv> },
) {
  return runCommand("bash", [automationBootstrapScript, ...args], { check, cwd, env });
}

async function importAutomationModule() {
  return import(`${pathToFileURL(automationScript).href}?t=${Date.now()}-${Math.random()}`);
}

function writeFakeGh(file: string, { authStatus = 0 } = {}) {
  writeFile(
    file,
    [
      "#!/bin/sh",
      "if [ \"$1\" = \"--version\" ]; then",
      "  echo \"gh version test\"",
      "  exit 0",
      "fi",
      "if [ \"$1\" = \"auth\" ] && [ \"$2\" = \"status\" ]; then",
      `  exit ${authStatus}`,
      "fi",
      "if [ \"$1\" = \"auth\" ] && [ \"$2\" = \"git-credential\" ]; then",
      "  exit 0",
      "fi",
      "exit 1",
      "",
    ].join("\n"),
  );
  fs.chmodSync(file, 0o755);
}

function writeFakeNpm(file: string) {
  writeFile(
    file,
    [
      "#!/bin/sh",
      "if [ \"$1\" = \"ci\" ]; then",
      "  mkdir -p node_modules/gray-matter",
      "  printf '{\"name\":\"gray-matter\"}\\n' > node_modules/gray-matter/package.json",
      "  exit 0",
      "fi",
      "exit 1",
      "",
    ].join("\n"),
  );
  fs.chmodSync(file, 0o755);
}

function resolveSystemGit() {
  return runCommand("bash", ["-lc", "command -v git"]).stdout.trim();
}

function writeFlakyGit(
  file: string,
  {
    failuresBeforeSuccess = 1,
    realGit = resolveSystemGit(),
    stateFile = `${file}.state`,
  }: {
    failuresBeforeSuccess?: number;
    realGit?: string;
    stateFile?: string;
  } = {},
) {
  writeFile(
    file,
    [
      "#!/bin/sh",
      `REAL_GIT='${realGit}'`,
      `STATE_FILE='${stateFile}'`,
      `FAILURES_BEFORE_SUCCESS='${failuresBeforeSuccess}'`,
      "if [ \"${1-}\" = \"--git-dir\" ] && [ \"${3-}\" = \"fetch\" ]; then",
      "  ATTEMPTS=0",
      "  if [ -f \"$STATE_FILE\" ]; then",
      "    ATTEMPTS=$(cat \"$STATE_FILE\")",
      "  fi",
      "  if [ \"$ATTEMPTS\" -lt \"$FAILURES_BEFORE_SUCCESS\" ]; then",
      "    NEXT_ATTEMPT=$((ATTEMPTS + 1))",
      "    printf '%s\\n' \"$NEXT_ATTEMPT\" > \"$STATE_FILE\"",
      "    printf 'simulated fetch failure %s\\n' \"$NEXT_ATTEMPT\" >&2",
      "    exit 1",
      "  fi",
      "fi",
      "exec \"$REAL_GIT\" \"$@\"",
      "",
    ].join("\n"),
  );
  fs.chmodSync(file, 0o755);
}

describe("daily-term automation", () => {
  it("reports diagram coverage for verified slugs", async () => {
    const automationModule = await importAutomationModule();

    expect(
      automationModule.buildDiagramCoverage(
        [
          { slug: "agent", diagram: "agent-loop" },
          { slug: "frontier-lab" },
        ],
        ["agent", "frontier-lab"],
      ),
    ).toEqual({
      withDiagram: [{ slug: "agent", diagram: "agent-loop" }],
      withoutDiagram: ["frontier-lab"],
    });
  });

  it("reports misunderstood score selection for verified slugs", async () => {
    const automationModule = await importAutomationModule();

    expect(
      automationModule.buildMisunderstoodSelection(
        [
          { slug: "agent", misunderstoodScore: 5 },
          { slug: "frontier-lab", misunderstoodScore: 4 },
        ],
        ["agent", "frontier-lab"],
        ["agent"],
      ),
    ).toEqual({
      selectedSlugs: ["agent"],
      verifiedSlugs: [
        { slug: "agent", misunderstoodScore: 5, selected: true },
        { slug: "frontier-lab", misunderstoodScore: 4, selected: false },
      ],
    });
  });

  it("keeps the publish allowlist aligned with verify's tracked artifacts", async () => {
    const automationModule = await importAutomationModule();

    expect([
      "docs/automation/daily-term-queue.json",
      "src/generated/entries.generated.json",
      "src/generated/entries.web.generated.json",
      "src/generated/entry-detail-shards.generated.ts",
      "src/generated/entry-details/t.json",
      `public/catalog/catalog.${"a".repeat(64)}.json`,
      `public/catalog/search-index.${"a".repeat(64)}.json`,
      "public/catalog/version.json",
      `public/mobile-catalog/entries.${"a".repeat(64)}.json`,
      "public/mobile-catalog/manifest.json",
    ].every((file) => automationModule.isAllowedPublishPath(file))).toBe(true);
  });

  it("returns the first queued terms in order and warns when the queue is running low", () => {
    const { sourceRepo } = createSourceFixture();
    const queuedSlugs = [
      "capability-overhang",
      "context-budget",
      "eval-leakage",
      "safety-debt",
      "retrieval-drift",
      "autonomy-tax",
    ];
    writeQueueFile(sourceRepo, queuedSlugs);

    const result = runAutomation(
      ["queue", "next", "--count", "7", "--json"],
      { cwd: sourceRepo },
    );
    const payload = JSON.parse(result.stdout);

    expect(payload.queuedCount).toBe(6);
    expect(payload.selectedCount).toBe(6);
    expect(payload.lowQueueWarning).toBe(true);
    expect(payload.remainingQueuedAfterSelection).toBe(0);
    expect(payload.items.map((item: { slug: string }) => item.slug)).toEqual(queuedSlugs);
  });

  it("fails clearly when fewer than five queued terms remain", () => {
    const { sourceRepo } = createSourceFixture();
    writeQueueFile(sourceRepo, [
      "capability-overhang",
      "context-budget",
      "eval-leakage",
      "safety-debt",
    ]);

    const result = runAutomation(
      ["queue", "next", "--count", "7", "--json"],
      { check: false, cwd: sourceRepo },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Queue depleted");
  });

  it("prefers the Homebrew gh path before PATH-driven fallbacks", async () => {
    const fakeHome = createTempDir("daily-term-automation-homebrew-order-");

    process.env.PATH = `${path.join(fakeHome, ".local", "bin")}:/usr/bin:/bin`;
    process.env.HOME = fakeHome;
    delete process.env.GH_PATH;

    const automationModule = await importAutomationModule();

    expect(automationModule.ghCommandCandidates()).toEqual([
      "/opt/homebrew/bin/gh",
      "/usr/local/bin/gh",
      "gh",
      path.join(fakeHome, ".local", "bin", "gh"),
      "/usr/bin/gh",
    ]);
  });

  it("prefers an explicit GH_PATH even when PATH omits it", async () => {
    const fakeHome = createTempDir("daily-term-automation-home-");
    const fakeGh = path.join(fakeHome, ".local", "bin", "gh");
    writeFakeGh(fakeGh);

    process.env.PATH = "/usr/bin:/bin";
    process.env.HOME = fakeHome;
    process.env.GH_PATH = fakeGh;

    const automationModule = await importAutomationModule();
    const remote = automationModule.resolveAutomationRemote(
      "git@github.com:DJNgoma/the-devils-ai-dictionary.git",
    );
    const gitArgs = automationModule.gitCommandArgs(
      ["fetch", "origin", "main"],
      { useGhCredentialHelper: true },
    );

    expect(automationModule.resolveGhCommand()).toBe(fakeGh);
    expect(remote).toMatchObject({
      fetchTarget: "https://github.com/DJNgoma/the-devils-ai-dictionary.git",
      pushTarget: "https://github.com/DJNgoma/the-devils-ai-dictionary.git",
      useGhCredentialHelper: true,
      transport: "https-gh",
    });
    expect(gitArgs.some((arg: string) => arg.includes(fakeGh))).toBe(true);
  });

  it("does not fall back to native transport when pinned gh auth status is unavailable", async () => {
    const fakeHome = createTempDir("daily-term-automation-gh-auth-down-");
    const fakeGh = path.join(fakeHome, ".local", "bin", "gh");
    writeFakeGh(fakeGh, { authStatus: 1 });

    process.env.PATH = "/usr/bin:/bin";
    process.env.HOME = fakeHome;
    process.env.GH_PATH = fakeGh;

    const automationModule = await importAutomationModule();
    const remote = automationModule.resolveAutomationRemote(
      "git@github.com:DJNgoma/the-devils-ai-dictionary.git",
    );

    expect(automationModule.resolveGhCommand()).toBe(fakeGh);
    expect(remote).toMatchObject({
      fetchTarget: "https://github.com/DJNgoma/the-devils-ai-dictionary.git",
      pushTarget: "https://github.com/DJNgoma/the-devils-ai-dictionary.git",
      useGhCredentialHelper: true,
      transport: "https-gh",
    });
  });

  it("fails clearly when an explicit GH_PATH is unusable", async () => {
    const fakeHome = createTempDir("daily-term-automation-bad-gh-path-");
    const fakeGh = path.join(fakeHome, ".local", "bin", "missing-gh");

    process.env.PATH = "/usr/bin:/bin";
    process.env.HOME = fakeHome;
    process.env.GH_PATH = fakeGh;

    const automationModule = await importAutomationModule();

    expect(() =>
      automationModule.resolveAutomationRemote(
        "git@github.com:DJNgoma/the-devils-ai-dictionary.git",
      ),
    ).toThrow(
      `GH_PATH is set to "${fakeGh}", but that gh command is not usable.`,
    );
  });

  it("prepares from a freshly refreshed origin/main when the remote is reachable", () => {
    const { remoteRepo, sourceRepo } = createSourceFixture();

    const result = runAutomation(
      ["prepare", "--source-repo", sourceRepo, "--json"],
      { cwd: sourceRepo },
    );
    const payload = JSON.parse(result.stdout);
    trackTempPath(payload.workspace);

    const sourceOriginMain = git(sourceRepo, "rev-parse", "refs/remotes/origin/main").stdout.trim();

    expect(payload.originFetchStatus).toBe("fresh");
    expect(payload.baseRef).toBe("refs/remotes/origin/main");
    expect(payload.baseCommit).toBe(sourceOriginMain);
    expect(payload.head).toBe(sourceOriginMain);
    expect(payload.branch).toBe("automation/daily-term-expansion");
    expect(payload.originUrl).toBe(remoteRepo);
    expect(payload.warnings).toEqual([]);
  }, 15_000);

  it("falls back to the cached source ref when refresh fails but origin/main is already cached", () => {
    const { remoteRepo, sourceRepo } = createSourceFixture();
    const offlineRepo = moveRemoteOffline(remoteRepo);

    const result = runAutomation(
      ["prepare", "--source-repo", sourceRepo, "--json"],
      { cwd: sourceRepo },
    );
    const payload = JSON.parse(result.stdout);
    trackTempPath(payload.workspace);

    const cachedOriginMain = git(sourceRepo, "rev-parse", "refs/remotes/origin/main").stdout.trim();

    expect(payload.originFetchStatus).toBe("cached");
    expect(payload.baseRef).toBe("refs/remotes/origin/main");
    expect(payload.baseCommit).toBe(cachedOriginMain);
    expect(payload.head).toBe(cachedOriginMain);
    expect(payload.warnings).toHaveLength(1);
    expect(payload.warnings[0]).toContain(
      "git fetch origin main failed after 3 attempts; using cached refs/remotes/origin/main from the source repo.",
    );

    restoreRemote(remoteRepo, offlineRepo);
  }, 15_000);

  it("fails clearly when refresh fails and the source checkout has no cached origin/main", () => {
    const sourceRepo = createTempDir("daily-term-automation-no-cache-");

    runCommand("git", ["init", "-b", "main", sourceRepo]);
    configureGitUser(sourceRepo);
    writeFile(path.join(sourceRepo, "README.md"), "# No cached origin/main\n");
    git(sourceRepo, "add", "README.md");
    git(sourceRepo, "commit", "-m", "Create a local-only repository");
    git(sourceRepo, "remote", "add", "origin", path.join(sourceRepo, "missing-remote.git"));

    const result = runAutomation(
      ["prepare", "--source-repo", sourceRepo, "--json"],
      { check: false, cwd: sourceRepo },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "Failed to refresh origin/main after 3 attempts and no cached refs/remotes/origin/main exists in the source repo.",
    );
  }, 15_000);

  it("still refuses to push when origin/main advanced after a cached prepare", () => {
    const { remoteRepo, sourceRepo } = createSourceFixture();
    const offlineRepo = moveRemoteOffline(remoteRepo);

    const prepare = runAutomation(
      ["prepare", "--source-repo", sourceRepo, "--json"],
      { cwd: sourceRepo },
    );
    const payload = JSON.parse(prepare.stdout);
    const workspace = payload.workspace as string;
    trackTempPath(workspace);

    expect(payload.originFetchStatus).toBe("cached");

    restoreRemote(remoteRepo, offlineRepo);
    advanceRemote(remoteRepo);

    configureGitUser(workspace);
    fs.appendFileSync(
      path.join(workspace, "content", "entries", "test-term.mdx"),
      "\nA newly cynical footnote.\n",
      "utf8",
    );

    const publish = runAutomation(
      [
        "publish",
        "test-term",
        "--message",
        "Expand the entries without prophecy",
        "--push",
        "--json",
      ],
      { check: false, cwd: workspace },
    );

    expect(publish.status).not.toBe(0);
    expect(publish.stderr).toContain(
      "origin/main moved after this run started; refusing to push a potentially stale branch.",
    );

    const ancestorCheck = gitNoCheck(
      workspace,
      "merge-base",
      "--is-ancestor",
      "origin/main",
      "HEAD",
    );
    expect(ancestorCheck.status).not.toBe(0);
  }, 30_000);

  it("rejects publish when changed entry slugs do not match the explicit publish list", () => {
    const { sourceRepo } = createSourceFixture();
    checkoutAutomationBranch(sourceRepo, "automation/publish-mismatch");

    fs.appendFileSync(
      path.join(sourceRepo, "content", "entries", "test-term.mdx"),
      "\nA newly queued footnote.\n",
      "utf8",
    );
    writeFile(
      path.join(sourceRepo, "content", "entries", "unlisted-term.mdx"),
      "---\nslug: \"unlisted-term\"\n---\n",
    );

    const result = runAutomation(
      ["publish", "test-term", "--message", "Expand the entries without prophecy"],
      { check: false, cwd: sourceRepo },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Changed entry slugs do not match the publish arguments.");
  });

  it("publishes mobile catalog artifacts and marks queued slugs as published in the same commit", () => {
    const { sourceRepo } = createSourceFixture();
    checkoutAutomationBranch(sourceRepo, "automation/publish-success");

    fs.appendFileSync(
      path.join(sourceRepo, "content", "entries", "test-term.mdx"),
      "\nA newly queued footnote.\n",
      "utf8",
    );
    writeFile(
      path.join(sourceRepo, "public", "mobile-catalog", "manifest.json"),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          catalogVersion: "a".repeat(64),
          publishedAt: "2026-04-27T00:00:00.000Z",
          snapshotPath: `/mobile-catalog/entries.${"a".repeat(64)}.json`,
        },
        null,
        2,
      )}\n`,
    );
    writeFile(
      path.join(sourceRepo, "public", "mobile-catalog", `entries.${"a".repeat(64)}.json`),
      `${JSON.stringify(
        { entries: [{ slug: "test-term" }], catalogVersion: "a".repeat(64), refreshed: true },
        null,
        2,
      )}\n`,
    );

    runAutomation(
      ["publish", "test-term", "--message", "Expand the entries without prophecy"],
      { cwd: sourceRepo },
    );

    const queue = JSON.parse(
      fs.readFileSync(
        path.join(sourceRepo, "docs", "automation", "daily-term-queue.json"),
        "utf8",
      ),
    );
    const publishedItem = queue.items.find((item: { slug: string }) => item.slug === "test-term");

    expect(publishedItem?.status).toBe("published");
    expect(typeof publishedItem?.publishedAt).toBe("string");
    expect(queue.updatedAt).toBe(publishedItem?.publishedAt);
    expect(git(sourceRepo, "status", "--short").stdout.trim()).toBe("");
  }, 15_000);

  it.skipIf(!fs.existsSync(automationBootstrapScript))(
    "bootstraps a fresh worktree and hydrates node_modules without depending on repo bootstrap code",
    () => {
      const { remoteRepo, sourceRepo } = createSourceFixture();
      const automationRoot = createTempDir("daily-term-bootstrap-root-");
      const fakeBin = createTempDir("daily-term-bootstrap-bin-");
      const fakeGit = path.join(fakeBin, "git");
      const fakeNpm = path.join(fakeBin, "npm");

      writeFile(
        path.join(sourceRepo, "package.json"),
        `${JSON.stringify({ name: "fixture", private: true }, null, 2)}\n`,
      );
      writeFile(path.join(sourceRepo, "package-lock.json"), "{\n  \"name\": \"fixture\",\n  \"lockfileVersion\": 3\n}\n");
      writeFile(path.join(sourceRepo, ".gitignore"), "node_modules/\n");
      writeFile(
        path.join(sourceRepo, "scripts", "with-node.sh"),
        "#!/usr/bin/env bash\nset -euo pipefail\nexec \"$@\"\n",
      );
      fs.chmodSync(path.join(sourceRepo, "scripts", "with-node.sh"), 0o755);
      git(sourceRepo, "add", ".");
      git(sourceRepo, "commit", "-m", "Add bootstrap fixture dependencies");
      git(sourceRepo, "push", "origin", "main");

      const remoteHead = git(sourceRepo, "rev-parse", "HEAD").stdout.trim();
      fs.appendFileSync(
        path.join(sourceRepo, "README.md"),
        "\nA dirty local checkout should not matter.\n",
        "utf8",
      );

      writeFlakyGit(fakeGit);
      writeFakeNpm(fakeNpm);

      const first = runBootstrap(
        [
          "--automation-root",
          automationRoot,
          "--repo-url",
          remoteRepo,
          "--branch",
          "main",
          "--json",
        ],
        {
          cwd: sourceRepo,
          env: {
            NODE_ENV: process.env.NODE_ENV ?? "test",
            PATH: `${fakeBin}:${process.env.PATH ?? "/usr/bin:/bin"}`,
            DAILY_TERM_BOOTSTRAP_FETCH_RETRY_MS: "1,1,1",
          },
        },
      );
      const firstPayload = JSON.parse(first.stdout);

      expect(firstPayload.baseCommit).toBe(remoteHead);
      expect(firstPayload.workspace).not.toBe(sourceRepo);
      expect(firstPayload.attemptCount).toBe(2);
      expect(firstPayload.dependencyCacheStatus).toBe("built");
      expect(firstPayload.lockfileHash).toMatch(/^[a-f0-9]{64}$/);
      expect(fs.existsSync(path.join(firstPayload.workspace, "node_modules", "gray-matter", "package.json"))).toBe(true);
      expect(git(firstPayload.workspace, "status", "--short").stdout.trim()).toBe("");

      const second = runBootstrap(
        [
          "--automation-root",
          automationRoot,
          "--repo-url",
          remoteRepo,
          "--branch",
          "main",
          "--json",
        ],
        {
          cwd: sourceRepo,
          env: {
            NODE_ENV: process.env.NODE_ENV ?? "test",
            PATH: `${fakeBin}:${process.env.PATH ?? "/usr/bin:/bin"}`,
            DAILY_TERM_BOOTSTRAP_FETCH_RETRY_MS: "1,1,1",
          },
        },
      );
      const secondPayload = JSON.parse(second.stdout);

      expect(secondPayload.attemptCount).toBe(1);
      expect(secondPayload.dependencyCacheStatus).toBe("restored");
      expect(secondPayload.lockfileHash).toBe(firstPayload.lockfileHash);
      expect(fs.existsSync(path.join(automationRoot, "repo.git"))).toBe(true);
      expect(fs.existsSync(path.join(secondPayload.workspace, "node_modules", "gray-matter", "package.json"))).toBe(true);
    },
    30_000,
  );

  it.skipIf(!fs.existsSync(automationBootstrapScript))(
    "evicts a stale bootstrap lock when the pid now belongs to an unrelated process",
    () => {
      const { remoteRepo, sourceRepo } = createSourceFixture();
      const automationRoot = createTempDir("daily-term-bootstrap-stale-lock-root-");
      const fakeBin = createTempDir("daily-term-bootstrap-stale-lock-bin-");
      const fakeGit = path.join(fakeBin, "git");
      const fakeNpm = path.join(fakeBin, "npm");
      const unrelatedPid = spawnPersistentProcess();

      writeFile(
        path.join(sourceRepo, "package.json"),
        `${JSON.stringify({ name: "fixture", private: true }, null, 2)}\n`,
      );
      writeFile(path.join(sourceRepo, "package-lock.json"), "{\n  \"name\": \"fixture\",\n  \"lockfileVersion\": 3\n}\n");
      writeFile(path.join(sourceRepo, ".gitignore"), "node_modules/\n");
      writeFile(
        path.join(sourceRepo, "scripts", "with-node.sh"),
        "#!/usr/bin/env bash\nset -euo pipefail\nexec \"$@\"\n",
      );
      fs.chmodSync(path.join(sourceRepo, "scripts", "with-node.sh"), 0o755);
      git(sourceRepo, "add", ".");
      git(sourceRepo, "commit", "-m", "Add bootstrap fixture dependencies");
      git(sourceRepo, "push", "origin", "main");

      const remoteHead = git(sourceRepo, "rev-parse", "HEAD").stdout.trim();

      writeFlakyGit(fakeGit, { failuresBeforeSuccess: 0 });
      writeFakeNpm(fakeNpm);
      writeFile(
        path.join(automationRoot, "bootstrap.lock.json"),
        `${JSON.stringify(
          {
            pid: unrelatedPid,
            startedAt: "2026-04-26T00:00:00.000Z",
            command: ["node", "/tmp/old-bootstrap.mjs", "--json"],
          },
          null,
          2,
        )}\n`,
      );

      const result = runBootstrap(
        [
          "--automation-root",
          automationRoot,
          "--repo-url",
          remoteRepo,
          "--branch",
          "main",
          "--json",
        ],
        {
          cwd: sourceRepo,
          env: {
            NODE_ENV: process.env.NODE_ENV ?? "test",
            PATH: `${fakeBin}:${process.env.PATH ?? "/usr/bin:/bin"}`,
            DAILY_TERM_BOOTSTRAP_FETCH_RETRY_MS: "1,1,1",
          },
        },
      );
      const payload = JSON.parse(result.stdout);

      expect(payload.baseCommit).toBe(remoteHead);
      expect(payload.workspace).not.toBe(sourceRepo);
      expect(payload.attemptCount).toBe(1);
      expect(payload.dependencyCacheStatus).toBe("built");
      expect(fs.existsSync(path.join(automationRoot, "bootstrap.lock.json"))).toBe(false);
    },
    30_000,
  );

  it.skipIf(!fs.existsSync(automationBootstrapScript))(
    "fails fast when the mirror cannot fetch a fresh main branch",
    () => {
      const { remoteRepo, sourceRepo } = createSourceFixture();
      const automationRoot = createTempDir("daily-term-bootstrap-failure-root-");
      const fakeBin = createTempDir("daily-term-bootstrap-failure-bin-");
      const fakeGit = path.join(fakeBin, "git");

      writeFlakyGit(fakeGit, { failuresBeforeSuccess: 99 });

      const result = runBootstrap(
        [
          "--automation-root",
          automationRoot,
          "--repo-url",
          remoteRepo,
          "--branch",
          "main",
          "--json",
        ],
        {
          check: false,
          cwd: sourceRepo,
          env: {
            NODE_ENV: process.env.NODE_ENV ?? "test",
            PATH: `${fakeBin}:${process.env.PATH ?? "/usr/bin:/bin"}`,
            DAILY_TERM_BOOTSTRAP_FETCH_RETRY_MS: "1,1,1",
          },
        },
      );

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("Failed to fetch origin/main after 3 attempts.");
      expect(result.stderr).toContain("simulated fetch failure 3");
      expect(fs.existsSync(path.join(automationRoot, "workspaces"))).toBe(false);
    },
    30_000,
  );
});
