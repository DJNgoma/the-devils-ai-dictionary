import { getCloudflareContext } from "@opennextjs/cloudflare";

export type PushDeliveryEnvironment = "development" | "production";

export const clientPushOptInStatuses = [
  "authorized",
  "denied",
  "ephemeral",
  "notDetermined",
  "provisional",
  "unsupported",
  "unknown",
] as const;

export const pushInstallationStatuses = [
  "authorized",
  "denied",
  "ephemeral",
  "notDetermined",
  "provisional",
  "unsupported",
  "unknown",
  "invalid",
] as const;

export type ClientPushOptInStatus = (typeof clientPushOptInStatuses)[number];
export type PushInstallationStatus = (typeof pushInstallationStatuses)[number];

export type D1PreparedStatementLike = {
  bind: (...values: unknown[]) => D1PreparedStatementLike;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  run: () => Promise<{
    changes?: number;
    meta?: {
      changes?: number;
    };
  }>;
  all: <T = Record<string, unknown>>() => Promise<{ results: T[] }>;
};

export type D1DatabaseLike = {
  prepare: (query: string) => D1PreparedStatementLike;
};

export const pushInstallationPlatforms = ["ios", "android", "web"] as const;
export type PushInstallationPlatform =
  (typeof pushInstallationPlatforms)[number];

export type MobilePushEnv = {
  APNS_BUNDLE_ID?: string;
  APNS_KEY_ID?: string;
  APNS_PRIVATE_KEY?: string;
  APNS_TEAM_ID?: string;
  APPLE_KEY_ID?: string;
  APPLE_NATIVE_CLIENT_ID?: string;
  APPLE_PRIVATE_KEY?: string;
  APPLE_SESSION_SECRET?: string;
  APPLE_TEAM_ID?: string;
  APPLE_WEB_CLIENT_ID?: string;
  APPLE_WEB_REDIRECT_URI?: string;
  FCM_PROJECT_ID?: string;
  FCM_SERVICE_ACCOUNT_JSON?: string;
  PUSH_INSTALLATIONS_DB?: D1DatabaseLike;
  PUSH_TEST_SEND_SECRET?: string;
  WEB_PUSH_VAPID_PRIVATE_KEY?: string;
  WEB_PUSH_VAPID_PUBLIC_KEY?: string;
  WEB_PUSH_VAPID_SUBJECT?: string;
  NEXT_PUBLIC_SITE_URL?: string;
};

export async function getMobilePushEnv(): Promise<MobilePushEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return env as MobilePushEnv;
}

export async function getAppServerEnv(): Promise<MobilePushEnv> {
  return getMobilePushEnv();
}

export function requirePushInstallationsDatabase(
  env: MobilePushEnv,
): D1DatabaseLike {
  const database = env.PUSH_INSTALLATIONS_DB;

  if (!database) {
    throw new Error(
      "Cloudflare D1 binding `PUSH_INSTALLATIONS_DB` is not configured.",
    );
  }

  return database;
}

export function requirePrimaryDatabase(env: MobilePushEnv): D1DatabaseLike {
  return requirePushInstallationsDatabase(env);
}
