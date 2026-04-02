import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mode = process.argv[2] ?? "build";

if (!["build", "run"].includes(mode)) {
  console.error("Usage: node scripts/ios-local-device.mjs <build|run>");
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const projectPath = 'ios/App/The Devil\'s AI Dictionary.xcodeproj';
const scheme = "The Devil's AI Dictionary";
const bundleId = "com.djngoma.devilsaidictionary";
const defaultDerivedDataPath = "tmp/ios-local-device-build";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit",
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runBuffered(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: rootDir,
    env: process.env,
    encoding: "utf8",
    ...options,
  });
}

function readDevicectlDevices() {
  const tempDir = mkdtempSync(path.join(tmpdir(), "ios-local-device-"));
  const jsonPath = path.join(tempDir, "devices.json");
  const result = spawnSync("xcrun", ["devicectl", "list", "devices", "-j", jsonPath], {
    cwd: rootDir,
    env: process.env,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }

    if (result.stderr) {
      process.stderr.write(result.stderr);
    }

    rmSync(tempDir, { force: true, recursive: true });
    process.exit(result.status ?? 1);
  }

  const raw = readFileSync(jsonPath, "utf8");
  rmSync(tempDir, { force: true, recursive: true });

  const payload = JSON.parse(raw);
  return payload.result?.devices ?? [];
}

function listAvailableDevices() {
  return readDevicectlDevices()
    .filter((device) => {
      const platform = device.hardwareProperties?.platform;
      const reality = device.hardwareProperties?.reality;
      const capabilities = device.capabilities ?? [];

      return (
        platform === "iOS" &&
        reality === "physical" &&
        capabilities.some(
          (capability) =>
            capability.featureIdentifier === "com.apple.coredevice.feature.connectdevice",
        )
      );
    })
    .map((device) => ({
      name: device.deviceProperties?.name ?? device.identifier,
      udid: device.hardwareProperties?.udid ?? device.identifier,
    }));
}

function resolveTarget() {
  const explicitId = process.env.IOS_DEVICE_ID?.trim();
  const explicitName = process.env.IOS_DEVICE_NAME?.trim();

  if (explicitId) {
    return {
      description: explicitId,
      devicectlDevice: explicitId,
      xcodeDestination: `id=${explicitId}`,
    };
  }

  if (explicitName) {
    return {
      description: explicitName,
      devicectlDevice: explicitName,
      xcodeDestination: `platform=iOS,name=${explicitName}`,
    };
  }

  const devices = listAvailableDevices();

  if (devices.length === 1) {
    const [device] = devices;

    return {
      description: `${device.name} (${device.udid})`,
      devicectlDevice: device.udid,
      xcodeDestination: `id=${device.udid}`,
    };
  }

  if (devices.length === 0) {
    console.error("No available connected iOS devices were found.");
    console.error(
      "Run `npm run ios:destinations` and connect or unlock your device, or set IOS_DEVICE_ID.",
    );
    process.exit(1);
  }

  console.error("Multiple available iOS devices were found. Set IOS_DEVICE_ID or IOS_DEVICE_NAME.");

  for (const device of devices) {
    console.error(`- ${device.name}: ${device.udid}`);
  }

  process.exit(1);
}

function buildApp(target, derivedDataPath) {
  console.log(`Building ${scheme} for ${target.description}.`);
  run("npm", ["run", "ios:prepare"]);
  run(process.execPath, [
    path.join(rootDir, "scripts", "with-xcode.mjs"),
    "xcodebuild",
    "-project",
    projectPath,
    "-scheme",
    scheme,
    "-configuration",
    "Debug",
    "-destination",
    target.xcodeDestination,
    "-derivedDataPath",
    derivedDataPath,
    "-allowProvisioningUpdates",
    "build",
  ]);
}

function installAndLaunch(target, derivedDataPath) {
  const appPath = path.join(
    rootDir,
    derivedDataPath,
    "Build",
    "Products",
    "Debug-iphoneos",
    `${scheme}.app`,
  );

  if (!existsSync(appPath)) {
    console.error(`Built app not found at ${appPath}`);
    process.exit(1);
  }

  console.log(`Installing ${bundleId} on ${target.description}.`);
  run("xcrun", ["devicectl", "device", "install", "app", "--device", target.devicectlDevice, appPath]);

  console.log(`Launching ${bundleId} on ${target.description}.`);
  const launchResult = runBuffered("xcrun", [
    "devicectl",
    "device",
    "process",
    "launch",
    "--device",
    target.devicectlDevice,
    "--terminate-existing",
    "--activate",
    bundleId,
  ]);

  if (launchResult.stdout) {
    process.stdout.write(launchResult.stdout);
  }

  if (launchResult.stderr) {
    process.stderr.write(launchResult.stderr);
  }

  if (launchResult.status !== 0) {
    const errorOutput = `${launchResult.stdout ?? ""}\n${launchResult.stderr ?? ""}`;

    if (errorOutput.includes("Locked") || errorOutput.includes("could not be, unlocked")) {
      console.error("Unlock the device and rerun `npm run ios:run:local-device`.");
    }

    process.exit(launchResult.status ?? 1);
  }
}

const derivedDataPath = process.env.IOS_DERIVED_DATA_PATH?.trim() || defaultDerivedDataPath;
const target = resolveTarget();

buildApp(target, derivedDataPath);

if (mode === "run") {
  installAndLaunch(target, derivedDataPath);
}
