import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const buildRoot = path.join(rootDir, "build");
const windowsProjectDir = path.join(buildRoot, "windows-app");
const windowsOutputDir = path.join(buildRoot, "windows-dist");
const packageJsonPath = path.join(rootDir, "package.json");
const npmCli = process.env.npm_execpath;

async function run(command, args, options = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      env: process.env,
      stdio: "inherit",
      ...options,
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${path.basename(command)} ${args.join(" ")} exited with code ${code}.`,
        ),
      );
    });
  });
}

async function prepareProject() {
  await run(process.execPath, [npmCli, "run", "build:mobile"]);

  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const electronVersion = packageJson.toolVersions?.electron ?? null;

  if (!electronVersion) {
    throw new Error("Unable to determine a fixed Electron version for Windows packaging.");
  }

  const desktopPackageJson = {
    name: "the-devils-ai-dictionary-windows",
    private: true,
    version: packageJson.version,
    productName: "The Devil's AI Dictionary",
    description: "Windows desktop build for The Devil's AI Dictionary",
    author: "DJ Ngoma",
    license: packageJson.license ?? "MIT",
    main: "main.cjs",
    build: {
      appId: "com.djngoma.devilsaidictionary.desktop",
      artifactName: "${productName}-${version}-windows-${arch}.${ext}",
      electronVersion,
      directories: {
        output: "../windows-dist",
      },
      files: ["main.cjs"],
      extraResources: [
        {
          from: "out",
          to: "out",
          filter: ["**/*"],
        },
      ],
      win: {
        target: [
          {
            target: "zip",
            arch: ["x64"],
          },
        ],
      },
    },
  };

  await rm(windowsProjectDir, { force: true, recursive: true });
  await rm(windowsOutputDir, { force: true, recursive: true });
  await mkdir(windowsProjectDir, { recursive: true });
  await cp(
    path.join(rootDir, "desktop", "electron", "main.cjs"),
    path.join(windowsProjectDir, "main.cjs"),
  );
  await cp(path.join(rootDir, "out"), path.join(windowsProjectDir, "out"), {
    recursive: true,
  });
  await writeFile(
    path.join(windowsProjectDir, "package.json"),
    `${JSON.stringify(desktopPackageJson, null, 2)}\n`,
  );
}

async function runElectronBuilder(args) {
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const electronBuilderVersion = packageJson.toolVersions?.electronBuilder ?? null;

  if (!electronBuilderVersion) {
    throw new Error("Unable to determine a fixed electron-builder version.");
  }

  await run(process.execPath, [
    npmCli,
    "exec",
    "--yes",
    "--package",
    `electron-builder@${electronBuilderVersion}`,
    "--",
    "electron-builder",
    ...args,
  ]);
}

async function main() {
  if (!npmCli) {
    throw new Error("Expected npm_execpath to be present when running the Windows build.");
  }

  await prepareProject();
  await runElectronBuilder([
    "--win",
    "zip",
    "--x64",
    "--publish",
    "never",
    "--projectDir",
    windowsProjectDir,
  ]);

  const artifacts = await readdir(windowsOutputDir);
  const zipArtifact = artifacts.find((entry) => entry.endsWith(".zip"));

  if (zipArtifact) {
    console.log(`Windows artifact ready at build/windows-dist/${zipArtifact}`);
    return;
  }

  console.log("Windows packaging completed, but no zip artifact was found in build/windows-dist.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
