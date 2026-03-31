import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const packageJsonPath = path.join(rootDir, "package.json");
const appVersionPath = path.join(rootDir, "app-version.json");
const iosProjectPath = path.join(
  rootDir,
  "ios",
  "App",
  "The Devil's AI Dictionary.xcodeproj",
  "project.pbxproj",
);

const checkOnly = process.argv.includes("--check");

function assertMarketingVersion(value) {
  if (!/^\d+\.\d+\.\d+$/.test(value)) {
    throw new Error(
      `Expected package.json version to use x.y.z format, received "${value}".`,
    );
  }
}

function assertBuildNumber(value) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(
      `Expected app-version.json buildNumber to be a positive integer, received "${value}".`,
    );
  }
}

async function main() {
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const appVersion = JSON.parse(await readFile(appVersionPath, "utf8"));

  const marketingVersion = packageJson.version;
  const buildNumber = appVersion.buildNumber;

  assertMarketingVersion(marketingVersion);
  assertBuildNumber(buildNumber);

  const originalProject = await readFile(iosProjectPath, "utf8");
  const syncedProject = originalProject
    .replace(
      /CURRENT_PROJECT_VERSION = [^;]+;/g,
      `CURRENT_PROJECT_VERSION = ${buildNumber};`,
    )
    .replace(
      /MARKETING_VERSION = [^;]+;/g,
      `MARKETING_VERSION = ${marketingVersion};`,
    );

  if (checkOnly) {
    if (originalProject !== syncedProject) {
      throw new Error(
        "Apple project versions are out of sync. Run `npm run version:sync`.",
      );
    }

    console.log(
      `Version settings already synced: ${marketingVersion} (${buildNumber}).`,
    );
    return;
  }

  if (originalProject !== syncedProject) {
    await writeFile(iosProjectPath, syncedProject);
  }

  console.log(`Synced versions: ${marketingVersion} (${buildNumber}).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
