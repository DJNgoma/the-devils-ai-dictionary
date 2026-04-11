import { NextResponse } from "next/server";
import {
  createAppleStateToken,
  sanitizeReturnTo,
} from "@/lib/server/auth";
import { getAppleWebClientId } from "@/lib/server/apple-auth";
import { getAppServerEnv } from "@/lib/server/cloudflare-context";

export const dynamic = "force-dynamic";

function resolveRedirectUri({
  envRedirectUri,
  fallbackBaseUrl,
}: {
  envRedirectUri?: string;
  fallbackBaseUrl: string;
}) {
  if (envRedirectUri?.trim()) {
    return envRedirectUri;
  }

  return new URL("/api/auth/apple/callback", fallbackBaseUrl).toString();
}

export async function GET(request: Request) {
  try {
    const env = await getAppServerEnv();
    const requestUrl = new URL(request.url);
    const baseUrl =
      env.NEXT_PUBLIC_SITE_URL?.trim() || requestUrl.origin;
    const returnTo = sanitizeReturnTo(
      requestUrl.searchParams.get("returnTo"),
    );
    const sessionSecret = env.APPLE_SESSION_SECRET;

    if (!sessionSecret) {
      throw new Error("Apple web sign-in requires APPLE_SESSION_SECRET.");
    }

    const state = await createAppleStateToken({
      returnTo,
      sessionSecret,
    });
    const redirectUri = resolveRedirectUri({
      envRedirectUri: env.APPLE_WEB_REDIRECT_URI,
      fallbackBaseUrl: baseUrl,
    });
    const authorizeUrl = new URL("https://appleid.apple.com/auth/authorize");

    authorizeUrl.searchParams.set("client_id", getAppleWebClientId(env));
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("response_mode", "form_post");
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", "name email");
    authorizeUrl.searchParams.set("state", state);

    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Apple sign-in could not start.",
        ok: false,
      },
      { status: 500 },
    );
  }
}
