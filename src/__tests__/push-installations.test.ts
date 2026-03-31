import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
} from "@/lib/server/cloudflare-context";
import {
  listTargetInstallations,
  markPushInstallationInvalid,
  markPushInstallationSuccess,
  upsertPushInstallation,
  type PushInstallationRecord,
} from "@/lib/server/push-installations";

type PreparedStatementMock = {
  bind: ReturnType<typeof vi.fn>;
  first: ReturnType<typeof vi.fn>;
  run: ReturnType<typeof vi.fn>;
  all: ReturnType<typeof vi.fn>;
};

function createPreparedStatementMock(): PreparedStatementMock {
  const statement = {
    bind: vi.fn(),
    first: vi.fn(),
    run: vi.fn(),
    all: vi.fn(),
  };

  statement.bind.mockReturnValue(statement);

  return statement;
}

function createDatabaseMock() {
  const statements: Array<{ query: string; statement: PreparedStatementMock }> = [];
  const database: D1DatabaseLike & { prepare: ReturnType<typeof vi.fn> } = {
    prepare: vi.fn((query: string) => {
      const statement = createPreparedStatementMock();
      statements.push({ query, statement });
      return statement as unknown as D1PreparedStatementLike;
    }),
  };

  return { database, statements };
}

describe("push installation persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts client-originated installation states", async () => {
    const { database, statements } = createDatabaseMock();
    const installation = {
      token: "token-1",
      platform: "ios" as const,
      environment: "development" as const,
      optInStatus: "provisional" as const,
      appVersion: "1.2.3",
      locale: "en-ZA",
    };

    await upsertPushInstallation(database, installation);

    expect(database.prepare).toHaveBeenCalledTimes(1);
    expect(statements[0]?.query).toContain("INSERT INTO push_installations");
    expect(statements[0]?.statement.bind).toHaveBeenCalledWith(
      installation.token,
      installation.platform,
      installation.environment,
      installation.optInStatus,
      installation.appVersion,
      installation.locale,
    );
    expect(statements[0]?.statement.run).toHaveBeenCalledTimes(1);
  });

  it("marks successful sends without changing the installation status", async () => {
    const { database, statements } = createDatabaseMock();

    await markPushInstallationSuccess(database, "token-2");

    expect(statements[0]?.query).toContain("last_success_at = datetime('now')");
    expect(statements[0]?.query).not.toContain("opt_in_status");
    expect(statements[0]?.statement.bind).toHaveBeenCalledWith("token-2");
    expect(statements[0]?.statement.run).toHaveBeenCalledTimes(1);
  });

  it("marks terminal APNs failures as invalid", async () => {
    const { database, statements } = createDatabaseMock();

    await markPushInstallationInvalid(database, "token-3");

    expect(statements[0]?.query).toContain("opt_in_status = 'invalid'");
    expect(statements[0]?.statement.bind).toHaveBeenCalledWith("token-3");
    expect(statements[0]?.statement.run).toHaveBeenCalledTimes(1);
  });

  it("only selects authorized iOS installations", async () => {
    const { database, statements } = createDatabaseMock();
    const records: PushInstallationRecord[] = [
      {
        token: "token-4",
        platform: "ios",
        environment: "production",
        optInStatus: "authorized",
        appVersion: "2.0.0",
        locale: "en-US",
        updatedAt: "2026-03-31T10:00:00.000Z",
        lastSuccessAt: null,
      },
    ];

    database.prepare.mockImplementation((query: string) => {
      const statement = createPreparedStatementMock();
      statement.all.mockResolvedValue({ results: records });
      statements.push({ query, statement });
      return statement;
    });

    const result = await listTargetInstallations(database);

    expect(statements[0]?.query).toContain("platform = 'ios'");
    expect(statements[0]?.query).toContain("opt_in_status = 'authorized'");
    expect(result).toEqual(records);
  });

  it("returns at most one authorized installation when targeting a token", async () => {
    const { database, statements } = createDatabaseMock();
    const record: PushInstallationRecord = {
      token: "token-5",
      platform: "ios",
      environment: "development",
      optInStatus: "authorized",
      appVersion: "2.0.1",
      locale: "en-GB",
      updatedAt: "2026-03-31T11:00:00.000Z",
      lastSuccessAt: "2026-03-31T11:05:00.000Z",
    };

    database.prepare.mockImplementation((query: string) => {
      const statement = createPreparedStatementMock();
      statement.first.mockResolvedValue(record);
      statements.push({ query, statement });
      return statement;
    });

    const result = await listTargetInstallations(database, "token-5");

    expect(statements[0]?.query).toContain("AND token = ?");
    expect(statements[0]?.query).toContain("LIMIT 1");
    expect(statements[0]?.statement.bind).toHaveBeenCalledWith("token-5");
    expect(result).toEqual([record]);
  });
});
