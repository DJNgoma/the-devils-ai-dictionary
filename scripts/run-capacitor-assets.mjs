import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const packageJson = JSON.parse(
  await readFile(path.join(repoRoot, "package.json"), "utf8"),
);
const capacitorAssetsVersion = packageJson.toolVersions?.capacitorAssets;

if (!capacitorAssetsVersion) {
  console.error("Missing toolVersions.capacitorAssets in package.json.");
  process.exit(1);
}

const npmCli = process.env.npm_execpath;
const npmArgs = [
  "exec",
  "--yes",
  "--package",
  `@capacitor/assets@${capacitorAssetsVersion}`,
  "--",
  "capacitor-assets",
  ...process.argv.slice(2),
];

const command = npmCli
  ? process.execPath
  : process.platform === "win32"
    ? "npm.cmd"
    : "npm";
const args = npmCli ? [npmCli, ...npmArgs] : npmArgs;

const child = spawn(command, args, {
  cwd: repoRoot,
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
