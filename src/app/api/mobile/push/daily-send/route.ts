import { NextResponse } from "next/server";
import { getTodayWord } from "@/lib/content";
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
  claimPushInstallationDelivery,
  listTargetInstallations,
  markPushInstallationInvalid,
  markPushInstallationSuccess,
} from "@/lib/server/push-installations";
import {
  getPushInstallationDeliveryDateKey,
  isPushInstallationDueNow,
} from "@/lib/server/push-delivery-schedule";
import {
  isTerminalWebPushFailure,
  sendCurrentWordWebPush,
} from "@/lib/server/web-push";

export const dynamic = "force-dynamic";
const pushSendConcurrency = 8;

async function mapWithConcurrencyLimit<T, TResult>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<TResult>,
) {
  const results = new Array<TResult>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]!);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );

  return results;
}

function isAuthorized(request: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

async function runDailySend() {
  const env = await getMobilePushEnv();
  const database = requirePushInstallationsDatabase(env);
  const now = new Date();
  const entry = await getTodayWord(now);

  if (!entry) {
    return NextResponse.json(
      { ok: false, error: "No entries available for daily send." },
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

  const authorizedInstallations = await listTargetInstallations(
    database,
    undefined,
    "web",
  );
  const installations = authorizedInstallations.filter((installation) =>
    isPushInstallationDueNow(installation, now),
  );

  const results = await mapWithConcurrencyLimit(
    installations,
    pushSendConcurrency,
    async (installation) => {
      const deliveryDateKey = getPushInstallationDeliveryDateKey(
        installation,
        now,
      );
      const claimed = await claimPushInstallationDelivery(
        database,
        installation.token,
        deliveryDateKey,
      );

      if (!claimed) {
        return {
          ok: false,
          skipped: true,
          status: 409,
          reason: "Delivery already claimed or completed for this local day.",
          token: installation.token,
        };
      }

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
    },
  );

  const sent = results.filter((r) => r.ok).length;
  const skippedAlreadyClaimed = results.filter(
    (r) => !r.ok && "skipped" in r && r.skipped,
  ).length;
  const failed = results.length - sent - skippedAlreadyClaimed;

  return NextResponse.json({
    ok: failed === 0,
    entry: { slug: entry.slug, title: entry.title },
    counts: {
      authorized: authorizedInstallations.length,
      due: installations.length,
      sent,
      failed,
      skippedAlreadyClaimed,
    },
    results,
  });
}

export async function POST(request: Request) {
  try {
    const env = await getMobilePushEnv();
    if (!isAuthorized(request, env.PUSH_TEST_SEND_SECRET)) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized daily send." },
        { status: 401 },
      );
    }
    return await runDailySend();
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Daily send failed.",
      },
      { status: 500 },
    );
  }
}
