import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
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
const openNextDir = path.join(projectRoot, ".open-next");
const openNextCacheDir = path.join(openNextDir, "cache");
const openNextAssetsDir = path.join(openNextDir, "assets");
const prerenderAssetsDir = path.join(openNextAssetsDir, "__opennext-prerender");
const workerPath = path.join(openNextDir, "worker.js");
const defaultHandlerPath = path.join(
  openNextDir,
  "server-functions",
  "default",
  "handler.mjs",
);
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

async function collectCacheFiles(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectCacheFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".cache")) {
      files.push(entryPath);
    }
  }

  return files;
}

async function getOpenNextBuildCacheDir() {
  const entries = await readdir(openNextCacheDir, { withFileTypes: true });
  const buildDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(openNextCacheDir, entry.name));

  if (buildDirs.length !== 1) {
    throw new Error(
      `Expected exactly one OpenNext cache build directory, found ${buildDirs.length}.`,
    );
  }

  return buildDirs[0];
}

function stripCacheExtension(relativeCachePath) {
  return relativeCachePath
    .slice(0, -".cache".length)
    .split(path.sep)
    .join("/");
}

async function writeRouteBodyAsset(routePath, body) {
  if (typeof body !== "string") {
    return false;
  }

  const outputPath = path.join(prerenderAssetsDir, routePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, Buffer.from(body, "base64"));
  return true;
}

async function writeAppPageAssets(routePath, cacheEntry) {
  if (typeof cacheEntry.html !== "string") {
    return false;
  }

  const htmlPath = path.join(prerenderAssetsDir, `${routePath}.html`);
  await mkdir(path.dirname(htmlPath), { recursive: true });
  await writeFile(htmlPath, cacheEntry.html, "utf8");

  if (typeof cacheEntry.rsc === "string") {
    const rscPath = path.join(prerenderAssetsDir, `${routePath}.rsc`);
    await writeFile(rscPath, cacheEntry.rsc, "utf8");
  }

  return true;
}

async function exportPrerenderedCacheAssets() {
  const buildCacheDir = await getOpenNextBuildCacheDir();
  const cacheFiles = await collectCacheFiles(buildCacheDir);
  let exported = 0;

  await rm(prerenderAssetsDir, { recursive: true, force: true });

  for (const cacheFile of cacheFiles) {
    const relativeCachePath = path.relative(buildCacheDir, cacheFile);
    const routePath = stripCacheExtension(relativeCachePath);
    const cacheEntry = JSON.parse(await readFile(cacheFile, "utf8"));
    const didExport =
      cacheEntry.type === "app"
        ? await writeAppPageAssets(routePath, cacheEntry)
        : cacheEntry.type === "route"
          ? await writeRouteBodyAsset(routePath, cacheEntry.body)
          : false;

    if (didExport) {
      exported += 1;
    }
  }

  console.log(`Exported ${exported} OpenNext prerender cache entries as static assets.`);
}

function buildPrerenderWorkerHelper() {
  return `const OP_NEXT_PRERENDER_PREFIX = "/__opennext-prerender";
const OP_NEXT_PRIMARY_HOST = "thedevilsaidictionary.com";
const OP_NEXT_WWW_HOST = "www.thedevilsaidictionary.com";

function opNextNormaliseHost(host) {
    return host?.toLowerCase().split(":")[0] ?? "";
}

function opNextNormalisePathname(pathname) {
    let decoded;
    try {
        decoded = decodeURIComponent(pathname);
    }
    catch {
        return null;
    }
    if (decoded.includes("..") || decoded.includes("\\\\")) {
        return null;
    }
    return decoded.replace(/\\/+$/, "") || "/";
}

function opNextRoutePath(pathname) {
    return pathname === "/" ? "index" : pathname.slice(1);
}

function opNextShouldBypassPrerender(pathname) {
    return pathname.startsWith("/api/") ||
        pathname.startsWith("/_next/") ||
        pathname.startsWith("/cdn-cgi/") ||
        pathname.startsWith("/catalog/") ||
        pathname.startsWith("/mobile-catalog/") ||
        pathname.startsWith("/.well-known/") ||
        pathname === "/random" ||
        pathname === "/web-push-sw.js";
}

function opNextIsRouteAsset(pathname) {
    return pathname === "/favicon.ico" ||
        pathname === "/icon" ||
        pathname === "/manifest.webmanifest" ||
        pathname === "/opengraph-image" ||
        pathname === "/robots.txt" ||
        pathname === "/sitemap.xml" ||
        pathname.endsWith("/opengraph-image");
}

function opNextContentType(pathname, variant) {
    if (variant === "rsc") {
        return "text/x-component; charset=utf-8";
    }
    if (variant === "html") {
        return "text/html; charset=utf-8";
    }
    if (pathname === "/favicon.ico") {
        return "image/x-icon";
    }
    if (pathname === "/icon" || pathname === "/opengraph-image" || pathname.endsWith("/opengraph-image")) {
        return "image/png";
    }
    if (pathname === "/manifest.webmanifest") {
        return "application/manifest+json; charset=utf-8";
    }
    if (pathname === "/robots.txt") {
        return "text/plain; charset=utf-8";
    }
    if (pathname === "/sitemap.xml") {
        return "application/xml; charset=utf-8";
    }
    return "application/octet-stream";
}

async function opNextMaybeGetPrerenderedResponse(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
        return null;
    }
    if (!env?.ASSETS) {
        return null;
    }
    const url = new URL(request.url);
    const host = opNextNormaliseHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host);
    if (host === OP_NEXT_WWW_HOST) {
        const redirectUrl = new URL(request.url);
        redirectUrl.protocol = "https:";
        redirectUrl.host = OP_NEXT_PRIMARY_HOST;
        return Response.redirect(redirectUrl, 308);
    }
    const pathname = opNextNormalisePathname(url.pathname);
    if (!pathname || opNextShouldBypassPrerender(pathname)) {
        return null;
    }
    const routePath = opNextRoutePath(pathname);
    const wantsRsc = url.searchParams.has("_rsc") ||
        request.headers.get("accept")?.includes("text/x-component");
    const variant = wantsRsc ? "rsc" : opNextIsRouteAsset(pathname) ? "route" : "html";
    const assetPath = variant === "route"
        ? \`\${OP_NEXT_PRERENDER_PREFIX}/\${routePath}\`
        : \`\${OP_NEXT_PRERENDER_PREFIX}/\${routePath}.\${variant}\`;
    const assetUrl = new URL(assetPath, request.url);
    const assetResponse = await env.ASSETS.fetch(new Request(assetUrl, request));
    if (!assetResponse.ok) {
        return null;
    }
    const headers = new Headers(assetResponse.headers);
    headers.set("content-type", opNextContentType(pathname, variant));
    headers.set("x-devils-prerender-cache", "hit");
    return new Response(request.method === "HEAD" ? null : assetResponse.body, {
        status: assetResponse.status,
        statusText: assetResponse.statusText,
        headers,
    });
}

`;
}

async function patchWorkerForPrerenderedAssets() {
  const workerSource = await readFile(workerPath, "utf8");
  let patchedSource = workerSource.replace(
    /^\/\/ @ts-expect-error: Will be resolved by wrangler build\nimport \{ handler as middlewareHandler \} from "\.\/middleware\/handler\.mjs";\n/m,
    "",
  );

  if (!patchedSource.includes("opNextMaybeGetPrerenderedResponse")) {
    patchedSource = patchedSource.replace(
      "export default {\n    async fetch(request, env, ctx) {\n",
      `${buildPrerenderWorkerHelper()}export default {\n    async fetch(request, env, ctx) {\n        const staticResponse = await opNextMaybeGetPrerenderedResponse(request, env);\n        if (staticResponse) {\n            return staticResponse;\n        }\n`,
    );
  }

  patchedSource = patchedSource.replace(
    "            // - `Request`s are handled by the Next server\n            const reqOrResp = await middlewareHandler(request, env, ctx);\n",
    "            // - `Request`s are handled by the Next server\n            // @ts-expect-error: resolved by wrangler build\n            const { handler: middlewareHandler } = await import(\"./middleware/handler.mjs\");\n            const reqOrResp = await middlewareHandler(request, env, ctx);\n",
  );

  if (patchedSource === workerSource) {
    throw new Error("OpenNext worker patch did not modify worker.js.");
  }

  await writeFile(workerPath, patchedSource, "utf8");
  console.log("Patched OpenNext worker to serve prerendered static assets first.");
}

async function patchUnusedOgExternalImport() {
  const handlerSource = await readFile(defaultHandlerPath, "utf8");
  const ogImportBranch = /([A-Za-z_$][\w$]*)==="next\/dist\/compiled\/@vercel\/og\/index\.node\.js"\?([A-Za-z_$][\w$]*)=await import\("next\/dist\/compiled\/@vercel\/og\/index\.edge\.js"\):\2=await import\(\1\)/g;
  const matches = handlerSource.match(ogImportBranch) ?? [];

  if (matches.length === 0) {
    throw new Error(
      "OpenNext @vercel/og external-import branch was not found.",
    );
  }

  const patchedSource = handlerSource.replace(
    ogImportBranch,
    (_match, requestedModule, importedModule) =>
      `${importedModule}=await import(${requestedModule})`,
  );
  await writeFile(defaultHandlerPath, patchedSource, "utf8");
  console.log(
    `Removed ${matches.length} unused @vercel/og renderer imports from the Worker handler.`,
  );
}

async function installPrerenderedWorkerFastPath() {
  await exportPrerenderedCacheAssets();
  await patchWorkerForPrerenderedAssets();
  await patchUnusedOgExternalImport();
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
  if (exitCode === 0 && args[0] === "build") {
    await installPrerenderedWorkerFastPath();
  }
  process.exit(exitCode);
} catch (error) {
  await restoreProxy();
  throw error;
}
