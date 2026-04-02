import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const iosProjectDir = path.join(repoRoot, "ios", "App");
const primaryAppDirName = "TheDevilsAIDictionary";
const compatibilityDirName = "App";
const primaryAppDir = path.join(iosProjectDir, primaryAppDirName);
const compatibilityDir = path.join(iosProjectDir, compatibilityDirName);
const primaryAppIconPath = path.join(
  primaryAppDir,
  "Assets.xcassets",
  "AppIcon.appiconset",
  "AppIcon-512@2x.png",
);
const capacitorCliArgs = process.argv.slice(2);

if (!fs.existsSync(primaryAppDir)) {
  console.error(`Expected Apple app directory at ${primaryAppDir}`);
  process.exit(1);
}

function listFilesRecursively(directory, predicate) {
  const matches = [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      matches.push(...listFilesRecursively(entryPath, predicate));
      continue;
    }

    if (predicate(entryPath)) {
      matches.push(entryPath);
    }
  }

  return matches;
}

function parsePixelDimensions(image) {
  if (typeof image.size !== "string") {
    return null;
  }

  const [widthString, heightString] = image.size.split("x");
  const width = Number.parseFloat(widthString);
  const height = Number.parseFloat(heightString);
  const scale = image.scale ? Number.parseFloat(String(image.scale).replace(/x$/u, "")) : 1;

  if (!Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(scale)) {
    return null;
  }

  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function resizeIcon(sourcePath, destinationPath, dimensions) {
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });

  const result = spawnSync(
    "sips",
    [
      "--resampleHeightWidth",
      String(dimensions.height),
      String(dimensions.width),
      sourcePath,
      "--out",
      destinationPath,
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );

  if (result.status !== 0) {
    const stderr = result.stderr.trim();
    const stdout = result.stdout.trim();
    const detail = stderr || stdout || `sips exited with code ${result.status}`;
    throw new Error(`Failed to generate ${destinationPath}: ${detail}`);
  }
}

function syncAppleAppIcons(sourcePath) {
  const contentsFiles = listFilesRecursively(
    iosProjectDir,
    (entryPath) => path.basename(entryPath) === "Contents.json" && path.basename(path.dirname(entryPath)).endsWith(".appiconset"),
  );
  const updatedTargets = [];
  const skippedTargets = [];

  for (const contentsPath of contentsFiles) {
    const appIconSetPath = path.dirname(contentsPath);
    const relativeIconSetPath = path.relative(repoRoot, appIconSetPath);
    const contents = JSON.parse(fs.readFileSync(contentsPath, "utf8"));
    const images = Array.isArray(contents.images) ? contents.images : [];
    const squareImages = [];
    let skippedReason = null;

    for (const image of images) {
      if (!image.filename) {
        continue;
      }

      const dimensions = parsePixelDimensions(image);
      if (!dimensions) {
        skippedReason = "contains icon slots with unsupported size metadata";
        break;
      }

      if (dimensions.width !== dimensions.height) {
        skippedReason = "contains non-square icon slots and needs a platform-specific manual pipeline";
        break;
      }

      squareImages.push({
        filename: image.filename,
        dimensions,
      });
    }

    if (skippedReason) {
      skippedTargets.push(`${relativeIconSetPath}: ${skippedReason}`);
      continue;
    }

    if (squareImages.length === 0) {
      continue;
    }

    for (const image of squareImages) {
      resizeIcon(sourcePath, path.join(appIconSetPath, image.filename), image.dimensions);
    }

    updatedTargets.push(relativeIconSetPath);
  }

  if (updatedTargets.length > 0) {
    console.log("Updated Apple app icon sets:");
    for (const target of updatedTargets) {
      console.log(`- ${target}`);
    }
  }

  if (skippedTargets.length > 0) {
    console.log("Skipped Apple app icon sets:");
    for (const target of skippedTargets) {
      console.log(`- ${target}`);
    }
  }
}

function runCapacitorIOSAssets() {
  return new Promise((resolve, reject) => {
    let createdCompatibilitySymlink = false;

    try {
      if (fs.existsSync(compatibilityDir)) {
        const stats = fs.lstatSync(compatibilityDir);

        if (!stats.isSymbolicLink()) {
          reject(
            new Error(
              `Refusing to overwrite ${compatibilityDir}; expected it to be absent so a temporary compatibility symlink can be created.`,
            ),
          );
          return;
        }
      } else {
        fs.symlinkSync(primaryAppDirName, compatibilityDir, "dir");
        createdCompatibilitySymlink = true;
      }
    } catch (error) {
      reject(error);
      return;
    }

    const child = spawn(
      process.execPath,
      [
        path.join(repoRoot, "scripts", "run-capacitor-assets.mjs"),
        "generate",
        "--ios",
        "--iosProject",
        "ios/App",
        ...capacitorCliArgs,
      ],
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

      if ((code ?? 1) !== 0) {
        reject(new Error(`capacitor-assets exited with code ${code ?? 1}`));
        return;
      }

      resolve();
    });
  });
}

try {
  await runCapacitorIOSAssets();

  if (!fs.existsSync(primaryAppIconPath)) {
    throw new Error(`Expected generated iOS app icon at ${primaryAppIconPath}`);
  }

  syncAppleAppIcons(primaryAppIconPath);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
