import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
} from "@/lib/server/cloudflare-context";
import {
  claimPushInstallationDelivery,
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
      preferredDeliveryHour: 7,
      timeZone: "Africa/Johannesburg",
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
      installation.preferredDeliveryHour,
      installation.timeZone,
    );
    expect(statements[0]?.statement.run).toHaveBeenCalledTimes(1);
  });

  it("uses ON CONFLICT to keep re-registration of the same token idempotent", async () => {
    const { database, statements } = createDatabaseMock();
    const installation = {
      token: "token-idem",
      platform: "ios" as const,
      environment: "production" as const,
      optInStatus: "authorized" as const,
      appVersion: "1.2.3",
      locale: "en-ZA",
      preferredDeliveryHour: 7,
      timeZone: "Africa/Johannesburg",
    };

    await upsertPushInstallation(database, installation);
    await upsertPushInstallation(database, installation);

    expect(database.prepare).toHaveBeenCalledTimes(2);
    const firstQuery = statements[0]?.query ?? "";
    expect(firstQuery).toContain("ON CONFLICT(token) DO UPDATE SET");
    expect(firstQuery).not.toMatch(/last_success_at\s*=\s*excluded/u);
    expect(firstQuery).not.toMatch(/last_success_date_key\s*=\s*excluded/u);
    expect(firstQuery).not.toMatch(/delivery_claim_date_key\s*=\s*excluded/u);
    expect(statements[1]?.query).toBe(firstQuery);
    expect(statements[0]?.statement.bind).toHaveBeenCalledWith(
      installation.token,
      installation.platform,
      installation.environment,
      installation.optInStatus,
      installation.appVersion,
      installation.locale,
      installation.preferredDeliveryHour,
      installation.timeZone,
    );
    expect(statements[1]?.statement.bind).toHaveBeenCalledWith(
      installation.token,
      installation.platform,
      installation.environment,
      installation.optInStatus,
      installation.appVersion,
      installation.locale,
      installation.preferredDeliveryHour,
      installation.timeZone,
    );
  });

  it("marks successful sends without changing the installation status", async () => {
    const { database, statements } = createDatabaseMock();

    await markPushInstallationSuccess(database, "token-2", "2026-04-15");

    expect(statements[0]?.query).toContain("last_success_at = datetime('now')");
    expect(statements[0]?.query).toContain("last_success_date_key = ?");
    expect(statements[0]?.query).not.toContain("opt_in_status");
    expect(statements[0]?.statement.bind).toHaveBeenCalledWith(
      "2026-04-15",
      "token-2",
    );
    expect(statements[0]?.statement.run).toHaveBeenCalledTimes(1);
  });

  it("marks terminal APNs failures as invalid", async () => {
    const { database, statements } = createDatabaseMock();

    await markPushInstallationInvalid(database, "token-3");

    expect(statements[0]?.query).toContain("opt_in_status = 'invalid'");
    expect(statements[0]?.statement.bind).toHaveBeenCalledWith("token-3");
    expect(statements[0]?.statement.run).toHaveBeenCalledTimes(1);
  });

  it("claims a delivery once per local day", async () => {
    const { database, statements } = createDatabaseMock();
    statements.length = 0;
    database.prepare.mockImplementation((query: string) => {
      const statement = createPreparedStatementMock();
      statement.run.mockResolvedValue({ meta: { changes: 1 } });
      statements.push({ query, statement });
      return statement;
    });

    const claimed = await claimPushInstallationDelivery(
      database,
      "token-claim",
      "2026-04-15",
    );

    expect(claimed).toBe(true);
    expect(statements[0]?.query).toContain("delivery_claim_date_key = ?");
    expect(statements[0]?.query).toContain("last_success_date_key != ?");
    expect(statements[0]?.statement.bind).toHaveBeenCalledWith(
      "2026-04-15",
      "token-claim",
      "2026-04-15",
      "2026-04-15",
    );
  });

  it("only selects authorized installations regardless of platform", async () => {
    const { database, statements } = createDatabaseMock();
    const records: PushInstallationRecord[] = [
      {
        token: "token-4",
        platform: "ios",
        environment: "production",
        optInStatus: "authorized",
        appVersion: "2.0.0",
        locale: "en-US",
        preferredDeliveryHour: 9,
        timeZone: "Africa/Johannesburg",
        updatedAt: "2026-03-31T10:00:00.000Z",
        lastSuccessAt: null,
        lastSuccessDateKey: null,
        deliveryClaimDateKey: null,
        deliveryClaimedAt: null,
      },
    ];

    database.prepare.mockImplementation((query: string) => {
      const statement = createPreparedStatementMock();
      statement.all.mockResolvedValue({ results: records });
      statements.push({ query, statement });
      return statement;
    });

    const result = await listTargetInstallations(database);

    expect(statements[0]?.query).toContain("opt_in_status = 'authorized'");
    expect(statements[0]?.query).not.toContain("platform = 'ios'");
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
      preferredDeliveryHour: 13,
      timeZone: "Europe/London",
      updatedAt: "2026-03-31T11:00:00.000Z",
      lastSuccessAt: "2026-03-31T11:05:00.000Z",
      lastSuccessDateKey: "2026-03-31",
      deliveryClaimDateKey: null,
      deliveryClaimedAt: null,
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
