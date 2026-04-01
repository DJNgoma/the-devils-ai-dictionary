import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const repoRoot = process.cwd();
const iosProjectDir = path.join(repoRoot, "ios", "App");
const appDirName = "TheDevilsAIDictionary";
const compatibilityDirName = "App";
const appDir = path.join(iosProjectDir, appDirName);
const compatibilityDir = path.join(iosProjectDir, compatibilityDirName);
const cliArgs = process.argv.slice(2);

if (!fs.existsSync(appDir)) {
  console.error(`Expected iOS app directory at ${appDir}`);
  process.exit(1);
}

let createdCompatibilitySymlink = false;

try {
  if (fs.existsSync(compatibilityDir)) {
    const stats = fs.lstatSync(compatibilityDir);

    if (!stats.isSymbolicLink()) {
      console.error(
        `Refusing to overwrite ${compatibilityDir}; expected it to be absent so a temporary compatibility symlink can be created.`,
      );
      process.exit(1);
    }
  } else {
    fs.symlinkSync(appDirName, compatibilityDir, "dir");
    createdCompatibilitySymlink = true;
  }

  const child = spawn(
    "npx",
    ["@capacitor/assets", "generate", "--ios", "--iosProject", "ios/App", ...cliArgs],
    {
      stdio: "inherit",
      cwd: repoRoot,
      shell: false,
    },
  );

  child.on("exit", (code, signal) => {
    if (createdCompatibilitySymlink && fs.existsSync(compatibilityDir)) {
      fs.unlinkSync(compatibilityDir);
    }

    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 1);
  });
} catch (error) {
  if (createdCompatibilitySymlink && fs.existsSync(compatibilityDir)) {
    fs.unlinkSync(compatibilityDir);
  }

  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
