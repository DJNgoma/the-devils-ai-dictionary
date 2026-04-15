import { beforeEach, describe, expect, it, vi } from "vitest";

const contentMocks = vi.hoisted(() => ({
  getTodayWord: vi.fn(),
}));
const cloudflareMocks = vi.hoisted(() => ({
  getMobilePushEnv: vi.fn(),
  requirePushInstallationsDatabase: vi.fn(),
}));
const apnsMocks = vi.hoisted(() => ({
  isTerminalApnsFailure: vi.fn(),
  sendCurrentWordPush: vi.fn(),
}));
const fcmMocks = vi.hoisted(() => ({
  isTerminalFcmFailure: vi.fn(),
  sendCurrentWordFcm: vi.fn(),
}));
const webPushMocks = vi.hoisted(() => ({
  isTerminalWebPushFailure: vi.fn(),
  sendCurrentWordWebPush: vi.fn(),
}));
const pushInstallationMocks = vi.hoisted(() => ({
  claimPushInstallationDelivery: vi.fn(),
  listTargetInstallations: vi.fn(),
  markPushInstallationInvalid: vi.fn(),
  markPushInstallationSuccess: vi.fn(),
}));
const scheduleMocks = vi.hoisted(() => ({
  getPushInstallationDeliveryDateKey: vi.fn(),
  isPushInstallationDueNow: vi.fn(),
}));

vi.mock("@/lib/content", () => ({
  getTodayWord: contentMocks.getTodayWord,
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

vi.mock("@/lib/server/apns", () => ({
  isTerminalApnsFailure: apnsMocks.isTerminalApnsFailure,
  sendCurrentWordPush: apnsMocks.sendCurrentWordPush,
}));

vi.mock("@/lib/server/fcm", () => ({
  isTerminalFcmFailure: fcmMocks.isTerminalFcmFailure,
  sendCurrentWordFcm: fcmMocks.sendCurrentWordFcm,
}));

vi.mock("@/lib/server/web-push", () => ({
  isTerminalWebPushFailure: webPushMocks.isTerminalWebPushFailure,
  sendCurrentWordWebPush: webPushMocks.sendCurrentWordWebPush,
}));

vi.mock("@/lib/server/push-installations", () => ({
  claimPushInstallationDelivery: pushInstallationMocks.claimPushInstallationDelivery,
  listTargetInstallations: pushInstallationMocks.listTargetInstallations,
  markPushInstallationInvalid: pushInstallationMocks.markPushInstallationInvalid,
  markPushInstallationSuccess: pushInstallationMocks.markPushInstallationSuccess,
}));

vi.mock("@/lib/server/push-delivery-schedule", () => ({
  getPushInstallationDeliveryDateKey:
    scheduleMocks.getPushInstallationDeliveryDateKey,
  isPushInstallationDueNow: scheduleMocks.isPushInstallationDueNow,
}));

import { POST } from "@/app/api/mobile/push/daily-send/route";

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

const todayWord = {
  devilDefinition: "Today's word, not a lucky dip.",
  slug: "todays-word",
  title: "Today's Word",
};

const installation = {
  appVersion: "1.2.3",
  environment: "production" as const,
  lastSuccessAt: null,
  lastSuccessDateKey: null,
  locale: "en-ZA",
  optInStatus: "authorized" as const,
  platform: "ios" as const,
  preferredDeliveryHour: 9,
  timeZone: "Africa/Johannesburg",
  token: "device-token",
  deliveryClaimDateKey: null,
  deliveryClaimedAt: null,
  updatedAt: "2026-04-12T06:00:00.000Z",
};

function createAuthorizedRequest() {
  return new Request("https://example.com/api/mobile/push/daily-send", {
    body: JSON.stringify({}),
    headers: {
      authorization: "Bearer push-secret",
    },
    method: "POST",
  });
}

describe("POST /api/mobile/push/daily-send", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    cloudflareMocks.getMobilePushEnv.mockResolvedValue(baseEnv);
    cloudflareMocks.requirePushInstallationsDatabase.mockReturnValue(database);
    contentMocks.getTodayWord.mockResolvedValue(todayWord);
    pushInstallationMocks.listTargetInstallations.mockResolvedValue([
      installation,
    ]);
    pushInstallationMocks.claimPushInstallationDelivery.mockResolvedValue(true);
    scheduleMocks.getPushInstallationDeliveryDateKey.mockReturnValue(
      "2026-04-12",
    );
    scheduleMocks.isPushInstallationDueNow.mockReturnValue(true);
    apnsMocks.isTerminalApnsFailure.mockReturnValue(false);
    fcmMocks.isTerminalFcmFailure.mockReturnValue(false);
    webPushMocks.isTerminalWebPushFailure.mockReturnValue(false);
  });

  it("rejects unauthorized requests", async () => {
    const response = await POST(
      new Request("https://example.com/api/mobile/push/daily-send", {
        body: JSON.stringify({}),
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "Unauthorized daily send.",
      ok: false,
    });
    expect(contentMocks.getTodayWord).not.toHaveBeenCalled();
  });

  it("returns 404 when no today's word is available", async () => {
    contentMocks.getTodayWord.mockResolvedValue(null);

    const response = await POST(createAuthorizedRequest());

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: "No entries available for daily send.",
      ok: false,
    });
  });

  it("sends the scheduled today's word to due installations", async () => {
    apnsMocks.sendCurrentWordPush.mockResolvedValue({
      ok: true,
      status: 200,
      token: installation.token,
    });

    const response = await POST(createAuthorizedRequest());

    expect(contentMocks.getTodayWord).toHaveBeenCalledWith(expect.any(Date));
    expect(apnsMocks.sendCurrentWordPush).toHaveBeenCalledWith(
      expect.objectContaining({
        entry: todayWord,
        token: installation.token,
      }),
    );
    expect(pushInstallationMocks.claimPushInstallationDelivery).toHaveBeenCalledWith(
      database,
      installation.token,
      "2026-04-12",
    );
    expect(pushInstallationMocks.markPushInstallationSuccess).toHaveBeenCalledWith(
      database,
      installation.token,
      "2026-04-12",
    );
    await expect(response.json()).resolves.toMatchObject({
      entry: {
        slug: todayWord.slug,
        title: todayWord.title,
      },
      ok: true,
      results: [{ ok: true, status: 200, token: installation.token }],
    });
  });

  it("does not send to installations that are not currently due", async () => {
    scheduleMocks.isPushInstallationDueNow.mockReturnValue(false);

    const response = await POST(createAuthorizedRequest());

    expect(apnsMocks.sendCurrentWordPush).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      counts: {
        authorized: 1,
        due: 0,
        failed: 0,
        sent: 0,
      },
      entry: {
        slug: todayWord.slug,
        title: todayWord.title,
      },
      ok: true,
    });
  });

  it("skips installations already claimed by another overlapping run", async () => {
    pushInstallationMocks.claimPushInstallationDelivery.mockResolvedValue(false);

    const response = await POST(createAuthorizedRequest());

    expect(apnsMocks.sendCurrentWordPush).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      counts: {
        authorized: 1,
        due: 1,
        failed: 0,
        sent: 0,
        skippedAlreadyClaimed: 1,
      },
      ok: true,
      results: [
        {
          ok: false,
          reason: "Delivery already claimed or completed for this local day.",
          skipped: true,
          status: 409,
          token: installation.token,
        },
      ],
    });
  });
});
