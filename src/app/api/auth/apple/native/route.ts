import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createAuthSession,
  upsertAppleUser,
} from "@/lib/server/auth";
import {
  buildAppleDisplayName,
  exchangeAppleAuthorizationCode,
  getAppleNativeClientId,
  verifyAppleIdentityToken,
} from "@/lib/server/apple-auth";
import {
  getAppServerEnv,
  requirePrimaryDatabase,
} from "@/lib/server/cloudflare-context";
import { listSavedWords } from "@/lib/server/saved-words";

export const dynamic = "force-dynamic";

const nativeApplePayloadSchema = z.object({
  authorizationCode: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  familyName: z.string().trim().min(1).optional(),
  givenName: z.string().trim().min(1).optional(),
  identityToken: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  userIdentifier: z.string().trim().min(1).optional(),
}).refine(
  (payload) => Boolean(payload.authorizationCode || payload.identityToken),
  {
    message: "Apple native sign-in requires an identity token or authorization code.",
    path: ["identityToken"],
  },
);

export async function POST(request: Request) {
  try {
    const payload = nativeApplePayloadSchema.parse(await request.json());
    const env = await getAppServerEnv();
    const clientId = getAppleNativeClientId(env);

    if (!clientId) {
      throw new Error(
        "Apple native sign-in requires APPLE_NATIVE_CLIENT_ID or APNS_BUNDLE_ID.",
      );
    }

    const exchange = payload.identityToken
      ? await verifyAppleIdentityToken({
          clientId,
          identityToken: payload.identityToken,
        })
      : await exchangeAppleAuthorizationCode({
          authorizationCode: payload.authorizationCode!,
          clientId,
          env,
        });
    const database = requirePrimaryDatabase(env);
    const user = await upsertAppleUser(database, {
      displayName: buildAppleDisplayName({
        email: payload.email ?? exchange.email,
        providedDisplayName:
          payload.name ??
          [payload.givenName, payload.familyName].filter(Boolean).join(" "),
      }),
      email: payload.email ?? exchange.email,
      emailVerified: exchange.emailVerified,
      isPrivateEmail: exchange.isPrivateEmail,
      sub: exchange.sub,
    });
    const session = await createAuthSession({
      database,
      platform: "ios",
      userId: user.id,
    });
    const savedWords = await listSavedWords(database, user.id);

    return NextResponse.json({
      expiresAt: session.expiresAt,
      ok: true,
      savedWordCount: savedWords.length,
      savedWords,
      sessionToken: session.sessionToken,
      user,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid Apple sign-in payload.",
          issues: error.issues,
          ok: false,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Apple native sign-in failed.",
        ok: false,
      },
      { status: 500 },
    );
  }
}
