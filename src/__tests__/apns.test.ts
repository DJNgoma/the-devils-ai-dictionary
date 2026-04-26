import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isTerminalApnsFailure,
  sendCurrentWordPush,
} from "@/lib/server/apns";
import type { Entry } from "@/lib/content";

const sampleEntry = {
  devilDefinition: "  A polished invention with extra whitespace.  ",
  slug: "agent",
  title: "Agent",
} as Entry;

describe("APNs helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-31T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("classifies terminal APNs failures separately from transient ones", () => {
    expect(
      isTerminalApnsFailure({
        ok: false,
        reason: "BadDeviceToken",
        status: 400,
        token: "token-1",
      }),
    ).toBe(true);
    expect(
      isTerminalApnsFailure({
        ok: false,
        reason: "DeviceTokenNotForTopic",
        status: 400,
        token: "token-2",
      }),
    ).toBe(true);
    expect(
      isTerminalApnsFailure({
        ok: false,
        status: 410,
        token: "token-3",
      }),
    ).toBe(true);
    expect(
      isTerminalApnsFailure({
        ok: false,
        reason: "Unregistered",
        status: 410,
        token: "token-3a",
      }),
    ).toBe(true);
    expect(
      isTerminalApnsFailure({
        ok: false,
        reason: "InternalServerError",
        status: 500,
        token: "token-4",
      }),
    ).toBe(false);
    expect(
      isTerminalApnsFailure({
        ok: false,
        reason: "TooManyRequests",
        status: 429,
        token: "token-4a",
      }),
    ).toBe(false);
  });

  it("sends the expected APNs payload to the environment-specific endpoint", async () => {
    const importKeySpy = vi
      .spyOn(globalThis.crypto.subtle, "importKey")
      .mockResolvedValue({} as CryptoKey);
    const signSpy = vi
      .spyOn(globalThis.crypto.subtle, "sign")
      .mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    const result = await sendCurrentWordPush({
      credentials: {
        bundleId: "com.example.devils",
        environment: "development",
        keyId: "KEY123",
        privateKey: "-----BEGIN PRIVATE KEY-----\\nAAAA\\n-----END PRIVATE KEY-----",
        teamId: "TEAM123",
      },
      entry: sampleEntry,
      token: "token-5",
    });

    expect(importKeySpy).toHaveBeenCalledTimes(1);
    expect(signSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe("https://api.sandbox.push.apple.com/3/device/token-5");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      "apns-priority": "10",
      "apns-push-type": "alert",
      "apns-topic": "com.example.devils",
      authorization: expect.stringMatching(/^bearer /u),
      "content-type": "application/json",
    });

    const body = JSON.parse(String(init?.body));
    expect(body).toEqual({
      aps: {
        alert: {
          title: "Agent",
          body: "A polished invention with extra whitespace.",
        },
        sound: "default",
      },
      slug: "agent",
      source: "notificationTap",
      sent_at: "2026-03-31T12:00:00.000Z",
    });
    expect(result).toEqual({
      ok: true,
      status: 200,
      token: "token-5",
    });
  });

  it("returns the APNs reason when Apple rejects a device token", async () => {
    vi.spyOn(globalThis.crypto.subtle, "importKey").mockResolvedValue(
      {} as CryptoKey,
    );
    vi.spyOn(globalThis.crypto.subtle, "sign").mockResolvedValue(
      new Uint8Array([4, 5, 6]).buffer,
    );
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ reason: "BadDeviceToken" }), {
        status: 400,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    const result = await sendCurrentWordPush({
      credentials: {
        bundleId: "com.example.devils",
        environment: "production",
        keyId: "KEY123",
        privateKey: "-----BEGIN PRIVATE KEY-----\\nAAAA\\n-----END PRIVATE KEY-----",
        teamId: "TEAM123",
      },
      entry: sampleEntry,
      token: "token-6",
    });

    expect(result).toEqual({
      ok: false,
      reason: "BadDeviceToken",
      status: 400,
      token: "token-6",
    });
  });

  it("surfaces APNs Unregistered (410) without a reason body", async () => {
    vi.spyOn(globalThis.crypto.subtle, "importKey").mockResolvedValue(
      {} as CryptoKey,
    );
    vi.spyOn(globalThis.crypto.subtle, "sign").mockResolvedValue(
      new Uint8Array([7, 8, 9]).buffer,
    );
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 410 }),
    );

    const result = await sendCurrentWordPush({
      credentials: {
        bundleId: "com.example.devils",
        environment: "production",
        keyId: "KEY123",
        privateKey: "-----BEGIN PRIVATE KEY-----\\nAAAA\\n-----END PRIVATE KEY-----",
        teamId: "TEAM123",
      },
      entry: sampleEntry,
      token: "token-410",
    });

    expect(result).toEqual({
      ok: false,
      reason: undefined,
      status: 410,
      token: "token-410",
    });
    expect(isTerminalApnsFailure(result)).toBe(true);
  });
});
