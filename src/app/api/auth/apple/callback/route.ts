import { NextResponse } from "next/server";
import {
  createAuthSession,
  SESSION_COOKIE_NAME,
  verifyAppleStateToken,
} from "@/lib/server/auth";
import {
  buildAppleDisplayName,
  exchangeAppleAuthorizationCode,
  getAppleWebClientId,
  parseAppleUserPayload,
} from "@/lib/server/apple-auth";
import {
  getAppServerEnv,
  requirePrimaryDatabase,
} from "@/lib/server/cloudflare-context";
import { upsertAppleUser } from "@/lib/server/auth";

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

function withStatus(redirectTo: string, status: string) {
  const url = new URL(redirectTo, "https://thedevilsaidictionary.com");
  url.searchParams.set("apple", status);
  return `${url.pathname}${url.search}${url.hash}`;
}

export async function POST(request: Request) {
  const env = await getAppServerEnv();
  const requestUrl = new URL(request.url);
  const baseUrl = env.NEXT_PUBLIC_SITE_URL?.trim() || requestUrl.origin;
  const redirectUri = resolveRedirectUri({
    envRedirectUri: env.APPLE_WEB_REDIRECT_URI,
    fallbackBaseUrl: baseUrl,
  });
  const secureCookie = redirectUri.startsWith("https://");

  try {
    const formData = await request.formData();
    const state = String(formData.get("state") ?? "");
    const sessionSecret = env.APPLE_SESSION_SECRET;

    if (!sessionSecret) {
      throw new Error("Apple web sign-in requires APPLE_SESSION_SECRET.");
    }

    const { returnTo } = await verifyAppleStateToken({
      sessionSecret,
      token: state,
    });

    if (formData.get("error")) {
      return NextResponse.redirect(
        new URL(withStatus(returnTo, "cancelled"), baseUrl),
      );
    }

    const authorizationCode = String(formData.get("code") ?? "").trim();

    if (!authorizationCode) {
      throw new Error("Apple did not return an authorization code.");
    }

    const exchange = await exchangeAppleAuthorizationCode({
      authorizationCode,
      clientId: getAppleWebClientId(env),
      env,
      redirectUri,
    });
    const userPayload = parseAppleUserPayload(
      formData.get("user")?.toString(),
    );
    const database = requirePrimaryDatabase(env);
    const user = await upsertAppleUser(database, {
      displayName: buildAppleDisplayName({
        email: exchange.email,
        userPayload,
      }),
      email: userPayload?.email ?? exchange.email,
      emailVerified: exchange.emailVerified,
      isPrivateEmail: exchange.isPrivateEmail,
      sub: exchange.sub,
    });
    const session = await createAuthSession({
      database,
      platform: "web",
      userId: user.id,
    });
    const response = NextResponse.redirect(
      new URL(withStatus(returnTo, "ok"), baseUrl),
    );

    response.cookies.set({
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 180,
      name: SESSION_COOKIE_NAME,
      path: "/",
      sameSite: "lax",
      secure: secureCookie,
      value: session.sessionToken,
    });

    return response;
  } catch {
    return NextResponse.redirect(
      new URL(withStatus("/settings", "failed"), baseUrl),
    );
  }
}
