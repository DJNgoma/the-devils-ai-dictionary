import { NextResponse } from "next/server";
import { z } from "zod";
import { getAllEntries, type Entry } from "@/lib/content";
import {
  getMobilePushEnv,
  requirePushInstallationsDatabase,
} from "@/lib/server/cloudflare-context";
import {
  isTerminalApnsFailure,
  sendCurrentWordPush,
} from "@/lib/server/apns";
import {
  isTerminalFcmFailure,
  sendCurrentWordFcm,
} from "@/lib/server/fcm";
import {
  listTargetInstallations,
  markPushInstallationInvalid,
  markPushInstallationSuccess,
} from "@/lib/server/push-installations";
import { getPushInstallationDeliveryDateKey } from "@/lib/server/push-delivery-schedule";
import {
  isTerminalWebPushFailure,
  sendCurrentWordWebPush,
} from "@/lib/server/web-push";

export const dynamic = "force-dynamic";

const testSendSchema = z.object({
  slug: z.string().trim().min(1).max(256).optional(),
  token: z.string().trim().min(1).max(4096).optional(),
  platform: z.enum(["ios", "android", "web"]).optional(),
});

function pickEntry(entries: Entry[], slug?: string) {
  if (slug) {
    return entries.find((entry) => entry.slug === slug);
  }

  if (entries.length === 0) {
    return undefined;
  }

  const index = Math.floor(Math.random() * entries.length);
  return entries[index];
}

function isAuthorized(request: Request, secret: string | undefined) {
  if (!secret) {
    return false;
  }

  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  try {
    const env = await getMobilePushEnv();

    if (!isAuthorized(request, env.PUSH_TEST_SEND_SECRET)) {
      return NextResponse.json(
        {
          error: "Unauthorized push test send.",
          ok: false,
        },
        { status: 401 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Request body is not valid JSON.",
          ok: false,
        },
        { status: 400 },
      );
    }

    const payload = testSendSchema.parse(body);
    const database = requirePushInstallationsDatabase(env);
    const entries = await getAllEntries();
    const entry = pickEntry(entries, payload.slug);

    if (!entry) {
      return NextResponse.json(
        {
          error: payload.slug
            ? `Entry "${payload.slug}" was not found.`
            : "No entries are available for push testing.",
          ok: false,
        },
        { status: 404 },
      );
    }

    const apnsConfigured =
      env.APNS_BUNDLE_ID &&
      env.APNS_KEY_ID &&
      env.APNS_PRIVATE_KEY &&
      env.APNS_TEAM_ID;
    const fcmConfigured = env.FCM_PROJECT_ID && env.FCM_SERVICE_ACCOUNT_JSON;
    const webPushConfigured =
      env.WEB_PUSH_VAPID_PRIVATE_KEY &&
      env.WEB_PUSH_VAPID_PUBLIC_KEY &&
      env.WEB_PUSH_VAPID_SUBJECT;

    const installations = await listTargetInstallations(
      database,
      payload.token,
      payload.platform,
    );

    if (installations.length === 0) {
      return NextResponse.json(
        {
          error: "No authorized push installations were found.",
          ok: false,
        },
        { status: 404 },
      );
    }

    const results = await Promise.all(
      installations.map(async (installation) => {
        const deliveryDateKey = getPushInstallationDeliveryDateKey(
          installation,
          new Date(),
        );

        if (installation.platform === "ios") {
          if (!apnsConfigured) {
            return {
              ok: false,
              status: 503,
              reason: "APNs credentials are not configured.",
              token: installation.token,
            };
          }
          const result = await sendCurrentWordPush({
            credentials: {
              bundleId: env.APNS_BUNDLE_ID!,
              environment: installation.environment,
              keyId: env.APNS_KEY_ID!,
              privateKey: env.APNS_PRIVATE_KEY!,
              teamId: env.APNS_TEAM_ID!,
            },
            entry,
            token: installation.token,
          });
          if (result.ok) {
            await markPushInstallationSuccess(
              database,
              installation.token,
              deliveryDateKey,
            );
          } else if (isTerminalApnsFailure(result)) {
            await markPushInstallationInvalid(database, installation.token);
          }
          return result;
        }

        if (installation.platform === "android") {
          if (!fcmConfigured) {
            return {
              ok: false,
              status: 503,
              reason: "FCM credentials are not configured.",
              token: installation.token,
            };
          }
          const result = await sendCurrentWordFcm({
            credentials: {
              projectId: env.FCM_PROJECT_ID!,
              serviceAccountJson: env.FCM_SERVICE_ACCOUNT_JSON!,
            },
            entry,
            token: installation.token,
          });
          if (result.ok) {
            await markPushInstallationSuccess(
              database,
              installation.token,
              deliveryDateKey,
            );
          } else if (isTerminalFcmFailure(result)) {
            await markPushInstallationInvalid(database, installation.token);
          }
          return result;
        }

        if (installation.platform === "web") {
          if (!webPushConfigured) {
            return {
              ok: false,
              status: 503,
              reason: "Web Push credentials are not configured.",
              token: installation.token,
            };
          }
          const result = await sendCurrentWordWebPush({
            credentials: {
              privateKey: env.WEB_PUSH_VAPID_PRIVATE_KEY!,
              publicKey: env.WEB_PUSH_VAPID_PUBLIC_KEY!,
              subject: env.WEB_PUSH_VAPID_SUBJECT!,
            },
            entry,
            token: installation.token,
          });
          if (result.ok) {
            await markPushInstallationSuccess(
              database,
              installation.token,
              deliveryDateKey,
            );
          } else if (isTerminalWebPushFailure(result)) {
            await markPushInstallationInvalid(database, installation.token);
          }
          return result;
        }

        return {
          ok: false,
          status: 501,
          reason: `Unknown platform "${installation.platform}".`,
          token: installation.token,
        };
      }),
    );

    return NextResponse.json({
      entry: {
        slug: entry.slug,
        title: entry.title,
      },
      ok: results.some((result) => result.ok),
      results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid push test payload.",
          issues: error.issues,
          ok: false,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Push test send failed.",
        ok: false,
      },
      { status: 500 },
    );
  }
}
