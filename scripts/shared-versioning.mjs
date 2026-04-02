import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

export const defaultRootDir = path.resolve(scriptDir, "..");

export function assertMarketingVersion(value) {
  if (!/^\d+\.\d+\.\d+$/.test(value)) {
    throw new Error(
      `Expected package.json version to use x.y.z format, received "${value}".`,
    );
  }
}

export function assertBuildNumber(value) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(
      `Expected app-version.json buildNumber to be a positive integer, received "${value}".`,
    );
  }
}

export function createWindowsBuildVersion(marketingVersion, buildNumber) {
  assertMarketingVersion(marketingVersion);
  assertBuildNumber(buildNumber);

  return `${marketingVersion}.${buildNumber}`;
}

export async function readSharedVersionConfig(rootDir = defaultRootDir) {
  const packageJsonPath = path.join(rootDir, "package.json");
  const appVersionPath = path.join(rootDir, "app-version.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const appVersion = JSON.parse(await readFile(appVersionPath, "utf8"));
  const marketingVersion = packageJson.version;
  const buildNumber = appVersion.buildNumber;

  assertMarketingVersion(marketingVersion);
  assertBuildNumber(buildNumber);

  return {
    rootDir,
    packageJsonPath,
    appVersionPath,
    packageJson,
    appVersion,
    marketingVersion,
    buildNumber,
    windowsBuildVersion: createWindowsBuildVersion(marketingVersion, buildNumber),
  };
}
