/**
 * www -> apex redirect for Workers and Node deploys using the Next.js proxy convention.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PRIMARY_HOST = "thedevilsaidictionary.com";
const WWW_HOST = `www.${PRIMARY_HOST}`;

function normaliseHost(host: string | null): string {
  return host?.toLowerCase().split(":")[0] ?? "";
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

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
