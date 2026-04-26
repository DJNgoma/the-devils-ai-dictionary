#!/usr/bin/env node
// Smoke-test the public Apple web sign-in entrypoint.
//
// Hits `/api/auth/apple/start` on the chosen target, refuses to follow the
// redirect, and asserts that the response is a 302 to
// `https://appleid.apple.com/auth/authorize` with the expected `client_id`
// query parameter. Until the Apple Services ID is live and the Cloudflare
// Worker secret `APPLE_WEB_CLIENT_ID` is set, the route returns a 500 JSON
// body — this script reports that surface clearly so the failure mode is
// obvious from CI or the terminal.
//
// Usage:
//   node scripts/verify-apple-web-signin.mjs                 # production
//   node scripts/verify-apple-web-signin.mjs --target=local  # http://localhost:3000
//   node scripts/verify-apple-web-signin.mjs --target=https://staging.example.com
//   node scripts/verify-apple-web-signin.mjs --expected-client-id=com.example.web

const DEFAULT_TARGET = "https://thedevilsaidictionary.com";
const LOCAL_TARGET = "http://localhost:3000";
const DEFAULT_EXPECTED_CLIENT_ID = "com.djngoma.devilsaidictionary.web";
const EXPECTED_AUTHORIZE_HOST = "appleid.apple.com";
const EXPECTED_AUTHORIZE_PATH = "/auth/authorize";

function parseArgs(argv) {
  const args = { expectedClientId: undefined, target: undefined };

  for (const raw of argv) {
    if (raw === "--help" || raw === "-h") {
      args.help = true;
      continue;
    }

    const [key, ...rest] = raw.split("=");
    const value = rest.join("=");

    if (key === "--target") {
      args.target = value || undefined;
    } else if (key === "--expected-client-id") {
      args.expectedClientId = value || undefined;
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

function printHelp() {
  console.log(
    `Usage: node scripts/verify-apple-web-signin.mjs [options]

Options:
  --target=<url|local|prod>     Origin to test. Defaults to ${DEFAULT_TARGET}.
                                "local" maps to ${LOCAL_TARGET}.
  --expected-client-id=<id>     Apple Services ID expected in the redirect.
                                Defaults to ${DEFAULT_EXPECTED_CLIENT_ID}.
  -h, --help                    Show this message.`,
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const targetOrigin = resolveTarget(args.target);
  const expectedClientId = args.expectedClientId ?? DEFAULT_EXPECTED_CLIENT_ID;
  const startUrl = `${targetOrigin}/api/auth/apple/start`;

  console.log(`Hitting ${startUrl} (expecting 302 to Apple, client_id=${expectedClientId}).`);

  let response;
  try {
    response = await fetch(startUrl, {
      headers: { accept: "application/json,text/html" },
      method: "GET",
      redirect: "manual",
    });
  } catch (error) {
    throw new Error(
      `Could not reach ${startUrl}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (response.status !== 302 && response.status !== 307) {
    const bodyText = await response.text().catch(() => "");
    let parsedMessage = "";

    try {
      const parsed = JSON.parse(bodyText);
      if (parsed && typeof parsed.error === "string") {
        parsedMessage = ` Server reported: "${parsed.error}".`;
      }
    } catch {
      // body was not JSON — leave parsedMessage empty
    }

    throw new Error(
      `Expected a 302 redirect from ${startUrl} but got ${response.status}.${parsedMessage} ` +
        `If APPLE_WEB_CLIENT_ID is unset on the worker the route returns 500; ` +
        `set it to the Apple Services ID and re-run.`,
    );
  }

  const location = response.headers.get("location");

  if (!location) {
    throw new Error(`Got ${response.status} from ${startUrl} but no Location header was set.`);
  }

  let redirectUrl;
  try {
    redirectUrl = new URL(location);
  } catch {
    throw new Error(`Location header "${location}" was not a valid URL.`);
  }

  if (redirectUrl.host !== EXPECTED_AUTHORIZE_HOST) {
    throw new Error(
      `Expected redirect host "${EXPECTED_AUTHORIZE_HOST}" but got "${redirectUrl.host}". ` +
        `Full Location: ${location}`,
    );
  }

  if (redirectUrl.pathname !== EXPECTED_AUTHORIZE_PATH) {
    throw new Error(
      `Expected redirect path "${EXPECTED_AUTHORIZE_PATH}" but got "${redirectUrl.pathname}".`,
    );
  }

  const observedClientId = redirectUrl.searchParams.get("client_id");

  if (!observedClientId) {
    throw new Error("Apple authorize URL did not include a client_id query parameter.");
  }

  const observedRedirectUri = redirectUrl.searchParams.get("redirect_uri");

  if (observedClientId !== expectedClientId) {
    throw new Error(
      `client_id mismatch: server returned "${observedClientId}", expected "${expectedClientId}". ` +
        `Update the Cloudflare Worker secret APPLE_WEB_CLIENT_ID or pass --expected-client-id.`,
    );
  }

  console.log("Apple web sign-in start route looks healthy:");
  console.log(`  status        ${response.status}`);
  console.log(`  authorize_url ${redirectUrl.origin}${redirectUrl.pathname}`);
  console.log(`  client_id     ${observedClientId}`);
  console.log(`  redirect_uri  ${observedRedirectUri ?? "<missing>"}`);
}

main().catch((error) => {
  console.error(`verify-apple-web-signin: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
