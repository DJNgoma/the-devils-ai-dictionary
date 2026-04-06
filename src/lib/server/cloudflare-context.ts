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
  run: () => Promise<unknown>;
  all: <T = Record<string, unknown>>() => Promise<{ results: T[] }>;
};

export type D1DatabaseLike = {
  prepare: (query: string) => D1PreparedStatementLike;
};

export const mobilePushPlatforms = ["ios", "android"] as const;
export type MobilePushPlatform = (typeof mobilePushPlatforms)[number];

export type MobilePushEnv = {
  APNS_BUNDLE_ID?: string;
  APNS_KEY_ID?: string;
  APNS_PRIVATE_KEY?: string;
  APNS_TEAM_ID?: string;
  FCM_PROJECT_ID?: string;
  FCM_SERVICE_ACCOUNT_JSON?: string;
  PUSH_INSTALLATIONS_DB?: D1DatabaseLike;
  PUSH_TEST_SEND_SECRET?: string;
};

export async function getMobilePushEnv(): Promise<MobilePushEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return env as MobilePushEnv;
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
