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
    PUSH_INSTALLATIONS_DB?: D1Database;
    PUSH_TEST_SEND_SECRET?: string;
  }
}

export {};
