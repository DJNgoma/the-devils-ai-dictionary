import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { defaultRootDir, readSharedVersionConfig } from "./shared-versioning.mjs";

const rootDir = defaultRootDir;
const iosProjectPath = path.join(
  rootDir,
  "ios",
  "App",
  "The Devil's AI Dictionary.xcodeproj",
  "project.pbxproj",
);

const checkOnly = process.argv.includes("--check");

async function main() {
  const { marketingVersion, buildNumber } = await readSharedVersionConfig(rootDir);

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
