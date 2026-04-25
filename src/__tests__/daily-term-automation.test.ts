import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const automationScript = path.resolve(
  __dirname,
  "../../scripts/daily-term-automation.mjs",
);

const tempPaths: string[] = [];
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
  }: {
    check?: boolean;
    cwd?: string;
  } = {},
) {
  const result = spawnSync(command, args, {
    cwd,
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

function writeFile(file: string, contents: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents, "utf8");
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
    path.join(seedRepo, "src", "generated", "entry-details.generated.json"),
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

function runAutomation(args: string[], { check = true, cwd }: { check?: boolean; cwd: string }) {
  return runCommand(process.execPath, [automationScript, ...args], { check, cwd });
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
  });

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
  });

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
  }, 15_000);
});
