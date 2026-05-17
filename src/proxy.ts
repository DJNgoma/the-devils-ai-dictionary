import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * www -> apex redirect for Workers and Node deploys using the Next.js proxy convention.
 */
const PRIMARY_HOST = "thedevilsaidictionary.com";
const WWW_HOST = `www.${PRIMARY_HOST}`;

const directoryParamNames = new Set([
  "q",
  "category",
  "difficulty",
  "vendor",
  "depth",
  "letter",
]);

function getDirectoryHash(searchParams: URLSearchParams) {
  const hashParams = new URLSearchParams();

  for (const [name, value] of searchParams) {
    if (directoryParamNames.has(name) && value.trim()) {
      hashParams.append(name, value);
    }
  }

  return hashParams.toString();
}

function hasDirectoryParams(searchParams: URLSearchParams) {
  for (const name of directoryParamNames) {
    if (searchParams.has(name)) {
      return true;
    }
  }

  return false;
}

function normaliseHost(host: string | null): string {
  return host?.toLowerCase().split(":")[0] ?? "";
}

function getDirectoryRedirect(request: NextRequest) {
  const { nextUrl } = request;
  const isLegacySearchRoute = nextUrl.pathname === "/search";
  const isDictionaryFilterRoute =
    nextUrl.pathname === "/dictionary" &&
    hasDirectoryParams(nextUrl.searchParams);

  if (!isLegacySearchRoute && !isDictionaryFilterRoute) {
    return null;
  }

  const targetUrl = nextUrl.clone();
  const hash = getDirectoryHash(nextUrl.searchParams);

  targetUrl.pathname = "/dictionary";
  targetUrl.search = "";
  targetUrl.hash = hash;

  return targetUrl;
}

export function proxy(request: NextRequest) {
  const host = normaliseHost(
    request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      request.nextUrl.host,
  );

  if (host === WWW_HOST) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = PRIMARY_HOST;
    return NextResponse.redirect(url, 308);
  }

  const directoryRedirect = getDirectoryRedirect(request);

  if (directoryRedirect) {
    return NextResponse.redirect(directoryRedirect, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
