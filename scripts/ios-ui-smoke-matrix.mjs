#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptFile = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptFile);
const repoRoot = path.resolve(scriptDir, "..");
const withXcodeScript = path.join(scriptDir, "with-xcode.mjs");
const xcodeProject = path.join(repoRoot, "ios", "App", "The Devil's AI Dictionary.xcodeproj");
const xcodeScheme = "The Devil's AI Dictionary";
const managedSimulatorPrefix = "Codex UI Smoke";

function parseVersion(version) {
  return String(version)
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);
}

function compareVersions(left, right) {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;

    if (leftPart !== rightPart) {
      return leftPart - rightPart;
    }
  }

  return 0;
}

function readSimctlJson(section) {
  return JSON.parse(execFileSync("xcrun", ["simctl", "list", "--json", section], { encoding: "utf8" }));
}

export function pickLatestAvailableIOSRuntime(runtimes) {
  const iosRuntimes = runtimes.filter((runtime) => runtime.isAvailable && runtime.platform === "iOS");

  if (iosRuntimes.length === 0) {
    throw new Error("No available iOS simulator runtimes were found.");
  }

  return iosRuntimes
    .slice()
    .sort((left, right) => compareVersions(right.version, left.version))[0];
}

export function buildSupportedIPhoneMatrix({ runtime }) {
  const supportedIPhones = runtime.supportedDeviceTypes.filter((deviceType) => deviceType.productFamily === "iPhone");

  if (supportedIPhones.length === 0) {
    throw new Error(`Runtime ${runtime.name} does not expose any supported iPhone simulator types.`);
  }

  const devices = supportedIPhones.map((deviceType) => ({
    name: deviceType.name,
    runtimeIdentifier: runtime.identifier,
    runtimeName: runtime.name,
    deviceTypeIdentifier: deviceType.identifier,
  }));

  if (devices.length === 0) {
    throw new Error(`No standard iPhone simulator types were available for ${runtime.name}.`);
  }

  return devices;
}

function extractNumericGeneration(deviceName) {
  const match = deviceName.match(/^iPhone (\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

export function buildDefaultIPhoneMatrix(matrix) {
  const generations = matrix
    .map((device) => extractNumericGeneration(device.name))
    .filter((generation) => generation !== null);

  const latestGeneration = generations.length > 0 ? Math.max(...generations) : null;
  const latestSE = matrix
    .filter((device) => device.name.startsWith("iPhone SE"))
    .sort((left, right) => left.name.localeCompare(right.name))
    .slice(-1);

  const selectedDevices = matrix.filter((device) => {
    if (latestGeneration !== null && extractNumericGeneration(device.name) === latestGeneration) {
      return true;
    }

    return device.name === "iPhone Air";
  });

  const selectedNames = new Set(selectedDevices.map((device) => device.name));

  for (const device of latestSE) {
    if (!selectedNames.has(device.name)) {
      selectedDevices.push(device);
    }
  }

  return selectedDevices;
}

export function selectIPhoneDevices(matrix, requestedDeviceNames) {
  if (requestedDeviceNames.length === 0) {
    return matrix;
  }

  const requestedSet = new Set(requestedDeviceNames);
  const selected = matrix.filter((device) => requestedSet.has(device.name));

  if (selected.length !== requestedSet.size) {
    const availableNames = matrix.map((device) => device.name).join(", ");
    const missingNames = requestedDeviceNames.filter((name) => !selected.some((device) => device.name === name));
    throw new Error(
      `Requested iPhone simulator(s) not available in the current matrix: ${missingNames.join(", ")}. Available devices: ${availableNames}`,
    );
  }

  return selected;
}

function findXCTestRunFile(derivedDataPath) {
  const productsDirectory = path.join(derivedDataPath, "Build", "Products");
  const pending = [productsDirectory];

  while (pending.length > 0) {
    const currentDirectory = pending.pop();
    const entries = readdirSync(currentDirectory, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(currentDirectory, entry.name);

      if (entry.isDirectory()) {
        pending.push(entryPath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith(".xctestrun")) {
        return entryPath;
      }
    }
  }

  throw new Error(`No .xctestrun file was generated in ${productsDirectory}.`);
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: "inherit",
      shell: false,
    });

    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} terminated with signal ${signal}.`));
        return;
      }

      if ((code ?? 1) !== 0) {
        reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? 1}.`));
        return;
      }

      resolve();
    });
  });
}

function runSimctl(args) {
  execFileSync("xcrun", ["simctl", ...args], {
    stdio: "ignore",
  });
}

function tryRunSimctl(args) {
  try {
    runSimctl(args);
  } catch {
    return false;
  }

  return true;
}

function runSimctlText(args) {
  return execFileSync("xcrun", ["simctl", ...args], {
    encoding: "utf8",
  }).trim();
}

function waitForSimulatorBoot(udid) {
  execFileSync("xcrun", ["simctl", "bootstatus", udid, "-b"], {
    stdio: "inherit",
  });
}

function prepareSimulator(udid, device) {
  tryRunSimctl(["shutdown", udid]);
  tryRunSimctl(["erase", udid]);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      runSimctl(["boot", udid]);
      waitForSimulatorBoot(udid);
      return udid;
    } catch (error) {
      if (attempt > 0) {
        throw error;
      }

      console.warn(`Boot failed for ${device.name}; recreating the managed simulator and retrying once.`);
      tryRunSimctl(["shutdown", udid]);
      tryRunSimctl(["delete", udid]);
      udid = runSimctlText(["create", managedSimulatorName(device), device.deviceTypeIdentifier, device.runtimeIdentifier]);
    }
  }
}

function managedSimulatorName(device) {
  return `${managedSimulatorPrefix} ${device.name}`;
}

function ensureManagedSimulator(device, devicesByRuntime) {
  const simulatorName = managedSimulatorName(device);
  const existingSimulator = (devicesByRuntime[device.runtimeIdentifier] ?? []).find(
    (simulator) =>
      simulator.isAvailable &&
      simulator.name === simulatorName &&
      simulator.deviceTypeIdentifier === device.deviceTypeIdentifier,
  );

  if (existingSimulator) {
    return existingSimulator.udid;
  }

  return runSimctlText(["create", simulatorName, device.deviceTypeIdentifier, device.runtimeIdentifier]);
}

function parseArgs(argv) {
  const requestedDeviceNames = [];
  let listOnly = false;
  let keepDerivedData = false;
  let allSupported = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--list") {
      listOnly = true;
      continue;
    }

    if (argument === "--keep-derived-data") {
      keepDerivedData = true;
      continue;
    }

    if (argument === "--all-supported") {
      allSupported = true;
      continue;
    }

    if (argument === "--device") {
      const deviceName = argv[index + 1];

      if (!deviceName) {
        throw new Error("--device requires an iPhone simulator name.");
      }

      requestedDeviceNames.push(deviceName);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return { requestedDeviceNames, listOnly, keepDerivedData, allSupported };
}

async function main(argv = process.argv.slice(2)) {
  const { requestedDeviceNames, listOnly, keepDerivedData, allSupported } = parseArgs(argv);
  const { runtimes } = readSimctlJson("runtimes");
  const { devices } = readSimctlJson("devices");
  const runtime = pickLatestAvailableIOSRuntime(runtimes);
  const fullMatrix = buildSupportedIPhoneMatrix({ runtime, devicesByRuntime: devices });
  const matrix = allSupported ? fullMatrix : buildDefaultIPhoneMatrix(fullMatrix);
  const selectedDevices = selectIPhoneDevices(matrix, requestedDeviceNames);

  console.log(`Latest iOS runtime: ${runtime.name}`);
  console.log(`iPhone matrix: ${selectedDevices.map((device) => device.name).join(", ")}`);

  if (listOnly) {
    return;
  }

  const derivedDataPath = mkdtempSync(path.join(os.tmpdir(), "devils-ios-ui-smoke-"));

  try {
    console.log(`Derived data: ${derivedDataPath}`);

    await runCommand("node", [
      withXcodeScript,
      "xcodebuild",
      "build-for-testing",
      "-project",
      xcodeProject,
      "-scheme",
      xcodeScheme,
      "-destination",
      "generic/platform=iOS Simulator",
      "-derivedDataPath",
      derivedDataPath,
      "CODE_SIGNING_ALLOWED=NO",
    ]);

    const xctestrunPath = findXCTestRunFile(derivedDataPath);

    for (const device of selectedDevices) {
      console.log(`\n==> ${device.name} (${device.runtimeName})`);
      const udid = prepareSimulator(ensureManagedSimulator(device, devices), device);
      await runCommand("node", [
        withXcodeScript,
        "xcodebuild",
        "test-without-building",
        "-xctestrun",
        xctestrunPath,
        "-destination",
        `id=${udid}`,
        "CODE_SIGNING_ALLOWED=NO",
      ]);
    }

    console.log(`\nCompleted iPhone UI smoke tests on ${selectedDevices.length} simulator(s).`);
  } catch (error) {
    console.error(`\nKept derived data at ${derivedDataPath} for inspection.`);
    throw error;
  } finally {
    if (!keepDerivedData) {
      rmSync(derivedDataPath, { recursive: true, force: true });
    }
  }
}

const isEntryPoint =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isEntryPoint) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
