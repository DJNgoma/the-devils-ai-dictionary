import { beforeEach, describe, expect, it, vi } from "vitest";

const cloudflareMocks = vi.hoisted(() => ({
  getMobilePushEnv: vi.fn(),
  requirePushInstallationsDatabase: vi.fn(),
}));
const pushInstallationMocks = vi.hoisted(() => ({
  upsertPushInstallation: vi.fn(),
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

vi.mock("@/lib/server/push-installations", () => ({
  upsertPushInstallation: pushInstallationMocks.upsertPushInstallation,
}));

import { POST } from "@/app/_api-server-only/mobile/push/installations/route";

describe("POST /api/mobile/push/installations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    cloudflareMocks.getMobilePushEnv.mockResolvedValue({
      PUSH_INSTALLATIONS_DB: { prepare: vi.fn() },
    });
    cloudflareMocks.requirePushInstallationsDatabase.mockReturnValue({
      prepare: vi.fn(),
    });
  });

  it("accepts client-originated installation statuses", async () => {
    pushInstallationMocks.upsertPushInstallation.mockResolvedValue(undefined);

    const response = await POST(
      new Request("https://example.com/api/mobile/push/installations", {
        body: JSON.stringify({
          appVersion: "1.2.3",
          environment: "production",
          locale: "en-ZA",
          optInStatus: "authorized",
          platform: "ios",
          token: "device-token",
        }),
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(pushInstallationMocks.upsertPushInstallation).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        optInStatus: "authorized",
        token: "device-token",
      }),
    );
  });

  it("rejects the server-only invalid status", async () => {
    const response = await POST(
      new Request("https://example.com/api/mobile/push/installations", {
        body: JSON.stringify({
          appVersion: "1.2.3",
          environment: "production",
          locale: "en-ZA",
          optInStatus: "invalid",
          platform: "ios",
          token: "device-token",
        }),
        method: "POST",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid installation payload.",
      ok: false,
    });
    expect(pushInstallationMocks.upsertPushInstallation).not.toHaveBeenCalled();
  });

  it("returns a server error when the D1 binding is unavailable", async () => {
    cloudflareMocks.requirePushInstallationsDatabase.mockImplementation(() => {
      throw new Error("Cloudflare D1 binding `PUSH_INSTALLATIONS_DB` is not configured.");
    });

    const response = await POST(
      new Request("https://example.com/api/mobile/push/installations", {
        body: JSON.stringify({
          appVersion: "1.2.3",
          environment: "production",
          locale: "en-ZA",
          optInStatus: "authorized",
          platform: "ios",
          token: "device-token",
        }),
        method: "POST",
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: "Cloudflare D1 binding `PUSH_INSTALLATIONS_DB` is not configured.",
      ok: false,
    });
  });
});
