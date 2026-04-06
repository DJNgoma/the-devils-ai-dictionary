import { beforeEach, describe, expect, it, vi } from "vitest";

const cloudflareMocks = vi.hoisted(() => ({
  getMobilePushEnv: vi.fn(),
  requirePushInstallationsDatabase: vi.fn(),
}));
const apnsMocks = vi.hoisted(() => ({
  sendCurrentWordPush: vi.fn(),
}));
const pushInstallationMocks = vi.hoisted(() => ({
  listTargetInstallations: vi.fn(),
  markPushInstallationInvalid: vi.fn(),
  markPushInstallationSuccess: vi.fn(),
}));

vi.mock("@/lib/server/cloudflare-context", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/server/cloudflare-context")
  >("@/lib/server/cloudflare-context");

  return {
    ...actual,
    getMobilePushEnv: cloudflareMocks.getMobilePushEnv,
    requirePushInstallationsDatabase:
      cloudflareMocks.requirePushInstallationsDatabase,
  };
});

vi.mock("@/lib/server/apns", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/apns")>(
    "@/lib/server/apns",
  );

  return {
    ...actual,
    sendCurrentWordPush: apnsMocks.sendCurrentWordPush,
  };
});

vi.mock("@/lib/server/push-installations", () => ({
  listTargetInstallations: pushInstallationMocks.listTargetInstallations,
  markPushInstallationInvalid: pushInstallationMocks.markPushInstallationInvalid,
  markPushInstallationSuccess: pushInstallationMocks.markPushInstallationSuccess,
}));

import { POST } from "@/app/api/mobile/push/test-send/route";

const database = {
  prepare: vi.fn(),
};

const baseEnv = {
  APNS_BUNDLE_ID: "com.example.dictionary",
  APNS_KEY_ID: "KEY123",
  APNS_PRIVATE_KEY: "PRIVATE_KEY",
  APNS_TEAM_ID: "TEAM123",
  PUSH_INSTALLATIONS_DB: database,
  PUSH_TEST_SEND_SECRET: "push-secret",
};

const installation = {
  appVersion: "1.2.3",
  environment: "production" as const,
  lastSuccessAt: null,
  locale: "en-ZA",
  optInStatus: "authorized" as const,
  platform: "ios" as const,
  token: "device-token",
  updatedAt: "2026-03-31T10:00:00.000Z",
};

function createAuthorizedRequest(body: Record<string, unknown>) {
  return new Request("https://example.com/api/mobile/push/test-send", {
    body: JSON.stringify(body),
    headers: {
      authorization: "Bearer push-secret",
    },
    method: "POST",
  });
}

describe("POST /api/mobile/push/test-send", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    cloudflareMocks.getMobilePushEnv.mockResolvedValue(baseEnv);
    cloudflareMocks.requirePushInstallationsDatabase.mockReturnValue(database);
  });

  it("rejects unauthorized requests", async () => {
    const response = await POST(
      new Request("https://example.com/api/mobile/push/test-send", {
        body: JSON.stringify({ slug: "agent" }),
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "Unauthorized push test send.",
      ok: false,
    });
    expect(pushInstallationMocks.listTargetInstallations).not.toHaveBeenCalled();
  });

  it("returns 404 when the requested entry does not exist", async () => {
    const response = await POST(createAuthorizedRequest({ slug: "missing-entry" }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Entry "missing-entry" was not found.',
      ok: false,
    });
  });

  it("returns 404 when no authorized installations are available", async () => {
    pushInstallationMocks.listTargetInstallations.mockResolvedValue([]);

    const response = await POST(createAuthorizedRequest({ slug: "agent" }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: "No authorized push installations were found.",
      ok: false,
    });
  });

  it("marks successful sends without invalidating the token", async () => {
    pushInstallationMocks.listTargetInstallations.mockResolvedValue([
      installation,
    ]);
    apnsMocks.sendCurrentWordPush.mockResolvedValue({
      ok: true,
      status: 200,
      token: installation.token,
    });

    const response = await POST(createAuthorizedRequest({ slug: "agent" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      entry: {
        slug: "agent",
        title: "Agent",
      },
      ok: true,
      results: [{ ok: true, status: 200, token: installation.token }],
    });
    expect(pushInstallationMocks.markPushInstallationSuccess).toHaveBeenCalledWith(
      database,
      installation.token,
    );
    expect(pushInstallationMocks.markPushInstallationInvalid).not.toHaveBeenCalled();
  });

  it("marks terminal APNs failures as invalid", async () => {
    pushInstallationMocks.listTargetInstallations.mockResolvedValue([
      installation,
    ]);
    apnsMocks.sendCurrentWordPush.mockResolvedValue({
      ok: false,
      reason: "BadDeviceToken",
      status: 400,
      token: installation.token,
    });

    const response = await POST(createAuthorizedRequest({ slug: "agent" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      results: [
        {
          ok: false,
          reason: "BadDeviceToken",
          status: 400,
          token: installation.token,
        },
      ],
    });
    expect(pushInstallationMocks.markPushInstallationInvalid).toHaveBeenCalledWith(
      database,
      installation.token,
    );
    expect(pushInstallationMocks.markPushInstallationSuccess).not.toHaveBeenCalled();
  });

  it("does not invalidate tokens for non-terminal APNs failures", async () => {
    pushInstallationMocks.listTargetInstallations.mockResolvedValue([
      installation,
    ]);
    apnsMocks.sendCurrentWordPush.mockResolvedValue({
      ok: false,
      reason: "InternalServerError",
      status: 500,
      token: installation.token,
    });

    const response = await POST(createAuthorizedRequest({ slug: "agent" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      results: [
        {
          ok: false,
          reason: "InternalServerError",
          status: 500,
          token: installation.token,
        },
      ],
    });
    expect(pushInstallationMocks.markPushInstallationInvalid).not.toHaveBeenCalled();
    expect(pushInstallationMocks.markPushInstallationSuccess).not.toHaveBeenCalled();
  });
});
