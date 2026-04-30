#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const DEFAULT_TARGET = "https://thedevilsaidictionary.com";
const LOCAL_TARGET = "http://localhost:3000";
const CLOUDFLARE_ERROR_PATTERNS = [
  /error\s*1102/i,
  /worker exceeded/i,
  /exceeded the cpu time limit/i,
  /cloudflare ray id/i,
  /cloudflare workers? error/i,
];

function parseArgs(argv) {
  const args = { target: undefined, help: false };

  for (const raw of argv) {
    if (raw === "--help" || raw === "-h") {
      args.help = true;
      continue;
    }

    const [key, ...rest] = raw.split("=");
    const value = rest.join("=");

    if (key === "--target") {
      args.target = value || undefined;
    }
  }

  return args;
}

function resolveTarget(rawTarget) {
  if (!rawTarget || rawTarget === "prod" || rawTarget === "production") {
    return DEFAULT_TARGET;
  }

  if (rawTarget === "local" || rawTarget === "dev") {
    return LOCAL_TARGET;
  }

  try {
    const parsed = new URL(rawTarget);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    throw new Error(`--target must be a URL, "local", or "prod" (got ${rawTarget}).`);
  }
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), "utf8"));
}

function printHelp() {
  console.log(
    `Usage: node scripts/verify-production-web.mjs [options]

Options:
  --target=<url|local|prod>   Origin to test. Defaults to ${DEFAULT_TARGET}.
                              "local" maps to ${LOCAL_TARGET}.
  -h, --help                  Show this message.`,
  );
}

async function fetchText(origin, pathname) {
  const url = `${origin}${pathname}`;
  let response;

  try {
    response = await fetch(url, {
      headers: { accept: "text/html,application/json,text/plain;q=0.8" },
      redirect: "manual",
    });
  } catch (error) {
    throw new Error(`${pathname} could not be reached: ${error instanceof Error ? error.message : String(error)}`);
  }

  const body = await response.text().catch(() => "");

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`${pathname} returned HTTP ${response.status}: ${body.slice(0, 240).trim()}`);
  }

  for (const pattern of CLOUDFLARE_ERROR_PATTERNS) {
    if (pattern.test(body)) {
      throw new Error(`${pathname} returned a Cloudflare/Worker error page matching ${pattern}.`);
    }
  }

  return { body, response };
}

function assertIncludes(label, body, expected) {
  if (!body.includes(expected)) {
    throw new Error(`${label} did not include expected text: ${expected}`);
  }
}

function assertJsonField(label, observed, expected) {
  if (observed !== expected) {
    throw new Error(`${label} mismatch: got ${JSON.stringify(observed)}, expected ${JSON.stringify(expected)}.`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const origin = resolveTarget(args.target);
  const expectedCatalog = readJson("public/catalog/version.json");
  const expectedMobileManifest = readJson("public/mobile-catalog/manifest.json");
  const smokeSlugs = ["tool-broker", "exception-budget", "agent-reliability"];

  console.log(`Verifying public web surface at ${origin}.`);

  const home = await fetchText(origin, "/");
  assertIncludes("Homepage", home.body, "The Devil");
  assertIncludes("Homepage", home.body, "Word of the day");
  assertIncludes("Homepage", home.body, `${expectedMobileManifest.entryCount}`);
  assertIncludes("Homepage", home.body, "AI terms arrive overdressed");

  const catalogVersion = await fetchText(origin, "/catalog/version.json");
  const observedCatalog = JSON.parse(catalogVersion.body);
  assertJsonField("Catalog version", observedCatalog.version, expectedCatalog.version);
  assertJsonField("Catalog path", observedCatalog.path, expectedCatalog.path);

  const mobileManifest = await fetchText(origin, "/mobile-catalog/manifest.json");
  const observedMobileManifest = JSON.parse(mobileManifest.body);
  assertJsonField("Mobile catalog version", observedMobileManifest.catalogVersion, expectedMobileManifest.catalogVersion);
  assertJsonField("Mobile entry count", observedMobileManifest.entryCount, expectedMobileManifest.entryCount);
  assertJsonField("Mobile snapshot path", observedMobileManifest.snapshotPath, expectedMobileManifest.snapshotPath);

  for (const slug of smokeSlugs) {
    const entry = await fetchText(origin, `/dictionary/${slug}`);
    assertIncludes(`/dictionary/${slug}`, entry.body, `<title>`);
    assertIncludes(`/dictionary/${slug}`, entry.body, "The Devil");
  }

  console.log("Public web surface looks healthy:");
  console.log(`  homepage includes ${expectedMobileManifest.entryCount} entries and Word of the day`);
  console.log(`  catalog version ${expectedCatalog.version}`);
  console.log(`  checked entries ${smokeSlugs.join(", ")}`);
}

main().catch((error) => {
  console.error(`verify-production-web: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
