import { access, rename } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const apiDir = path.join(rootDir, "src", "app", "api");
const hiddenApiDir = path.join(rootDir, "src", "app", "_api-server-only");

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function runNextBuild() {
  await new Promise((resolve, reject) => {
    const child = spawn("next", ["build"], {
      cwd: rootDir,
      env: {
        ...process.env,
        NEXT_OUTPUT_MODE: "export",
      },
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Static export failed with exit code ${code}.`));
    });
  });
}

async function main() {
  const hiddenDirExists = await pathExists(hiddenApiDir);
  if (hiddenDirExists) {
    throw new Error(
      "Expected src/app/_api-server-only to be absent before static export.",
    );
  }

  const apiDirExists = await pathExists(apiDir);

  if (apiDirExists) {
    await rename(apiDir, hiddenApiDir);
  }

  try {
    await runNextBuild();
  } finally {
    if (apiDirExists) {
      await rename(hiddenApiDir, apiDir);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
