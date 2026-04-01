import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

const command = process.argv[2];
const args = process.argv.slice(3);

if (!command) {
  console.error("Usage: node scripts/with-xcode.mjs <command> [args...]");
  process.exit(1);
}

function developerDirHasXcodebuild(candidate) {
  return existsSync(`${candidate}/usr/bin/xcodebuild`);
}

function resolveDeveloperDir() {
  const explicitDeveloperDir = process.env.DEVELOPER_DIR;

  if (explicitDeveloperDir) {
    if (developerDirHasXcodebuild(explicitDeveloperDir)) {
      return explicitDeveloperDir;
    }

    console.error(`DEVELOPER_DIR does not contain xcodebuild: ${explicitDeveloperDir}`);
    process.exit(1);
  }

  const candidates = [
    "/Applications/Xcode.app/Contents/Developer",
    "/Applications/Xcode-beta.app/Contents/Developer",
  ];

  return candidates.find((candidate) => developerDirHasXcodebuild(candidate));
}

const developerDir = resolveDeveloperDir();
const env = { ...process.env };

if (developerDir) {
  env.DEVELOPER_DIR = developerDir;
}

const child = spawn(command, args, {
  stdio: "inherit",
  env,
  shell: false,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
