import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: node scripts/run-opennext-cloudflare.mjs <opennext-args...>");
  process.exit(1);
}

const projectRoot = process.cwd();
const srcDir = path.join(projectRoot, "src");
const proxyPath = path.join(srcDir, "proxy.ts");
const middlewarePath = path.join(srcDir, "middleware.ts");
const tempDir = path.join(projectRoot, ".open-next-tmp");
const proxyBackupPath = path.join(tempDir, "proxy.ts");
const opennextBin = path.join(
  projectRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "opennextjs-cloudflare.cmd" : "opennextjs-cloudflare",
);

let swappedProxyForMiddleware = false;

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function restoreProxy() {
  if (!swappedProxyForMiddleware) {
    return;
  }

  await rm(middlewarePath, { force: true });
  await rename(proxyBackupPath, proxyPath);
  swappedProxyForMiddleware = false;
}

async function prepareProxyCompatibilityShim() {
  if (!(await exists(proxyPath)) || (await exists(middlewarePath))) {
    return;
  }

  await mkdir(tempDir, { recursive: true });
  const proxySource = await readFile(proxyPath, "utf8");
  const middlewareSource = proxySource.replace(
    /\bexport function proxy\b/,
    "export function middleware",
  );

  await rename(proxyPath, proxyBackupPath);
  await writeFile(middlewarePath, middlewareSource, "utf8");

  swappedProxyForMiddleware = true;
}

function runOpenNext() {
  return new Promise((resolve, reject) => {
    const child = spawn(opennextBin, args, {
      cwd: projectRoot,
      stdio: ["inherit", "pipe", "pipe"],
      env: process.env,
    });

    const writeFiltered = (stream) => (chunk) => {
      const text = chunk.toString().replace(
        /^.*The "middleware" file convention is deprecated\. Please use "proxy" instead\..*\r?\n?/gm,
        "",
      );

      if (text.length > 0) {
        stream.write(text);
      }
    };

    child.stdout?.on("data", writeFiltered(process.stdout));
    child.stderr?.on("data", writeFiltered(process.stderr));

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`opennextjs-cloudflare exited with signal ${signal}`));
        return;
      }

      resolve(code ?? 1);
    });
  });
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    try {
      await restoreProxy();
    } finally {
      process.exit(1);
    }
  });
}

try {
  await prepareProxyCompatibilityShim();
  const exitCode = await runOpenNext();
  await restoreProxy();
  process.exit(exitCode);
} catch (error) {
  await restoreProxy();
  throw error;
}
