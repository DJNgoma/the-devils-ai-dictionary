declare global {
  type D1PreparedStatementLike = {
    bind: (...values: unknown[]) => D1PreparedStatementLike;
    first: <T = Record<string, unknown>>() => Promise<T | null>;
    run: () => Promise<unknown>;
    all: <T = Record<string, unknown>>() => Promise<{ results: T[] }>;
  };

  type D1Database = {
    prepare: (query: string) => D1PreparedStatementLike;
  };

  interface CloudflareEnv {
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
    PUSH_INSTALLATIONS_DB?: D1Database;
    PUSH_TEST_SEND_SECRET?: string;
    NEXT_PUBLIC_SITE_URL?: string;
    WEB_PUSH_VAPID_PRIVATE_KEY?: string;
    WEB_PUSH_VAPID_PUBLIC_KEY?: string;
    WEB_PUSH_VAPID_SUBJECT?: string;
  }
}

export {};
