import { getCloudflareContext } from "@opennextjs/cloudflare";

export type PushDeliveryEnvironment = "development" | "production";

export type PushOptInStatus =
  | "authorized"
  | "denied"
  | "ephemeral"
  | "notDetermined"
  | "provisional"
  | "unsupported"
  | "unknown";

export type D1PreparedStatementLike = {
  bind: (...values: unknown[]) => D1PreparedStatementLike;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  run: () => Promise<unknown>;
  all: <T = Record<string, unknown>>() => Promise<{ results: T[] }>;
};

export type D1DatabaseLike = {
  prepare: (query: string) => D1PreparedStatementLike;
};

export type MobilePushEnv = {
  APNS_BUNDLE_ID?: string;
  APNS_KEY_ID?: string;
  APNS_PRIVATE_KEY?: string;
  APNS_TEAM_ID?: string;
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
