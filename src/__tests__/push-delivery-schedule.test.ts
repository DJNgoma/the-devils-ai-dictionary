import { describe, expect, it } from "vitest";
import {
  defaultPushDeliveryHour,
  isPushInstallationDueNow,
  normalizePreferredDeliveryHour,
  normalizePushTimeZone,
} from "@/lib/server/push-delivery-schedule";

describe("push delivery schedule", () => {
  it("defaults the preferred hour when the stored value is missing", () => {
    expect(normalizePreferredDeliveryHour(undefined)).toBe(defaultPushDeliveryHour);
    expect(normalizePreferredDeliveryHour(99)).toBe(defaultPushDeliveryHour);
  });

  it("falls back to the editorial timezone when the stored zone is invalid", () => {
    expect(normalizePushTimeZone(undefined)).toBe("Africa/Johannesburg");
    expect(normalizePushTimeZone("Mars/Olympus")).toBe("Africa/Johannesburg");
  });

  it("is due when the installation's local hour matches and it has not been sent today", () => {
    const now = new Date("2026-04-11T07:00:00.000Z");

    expect(
      isPushInstallationDueNow(
        {
          lastSuccessAt: "2026-04-10T06:59:00.000Z",
          preferredDeliveryHour: 9,
          timeZone: "Europe/Berlin",
        },
        now,
      ),
    ).toBe(true);
  });

  it("is not due when the installation's local hour does not match", () => {
    const now = new Date("2026-04-11T07:00:00.000Z");

    expect(
      isPushInstallationDueNow(
        {
          lastSuccessAt: null,
          preferredDeliveryHour: 8,
          timeZone: "Europe/Berlin",
        },
        now,
      ),
    ).toBe(false);
  });

  it("is not due when the installation already received today's send in its local timezone", () => {
    const now = new Date("2026-04-11T07:00:00.000Z");

    expect(
      isPushInstallationDueNow(
        {
          lastSuccessAt: "2026-04-11T05:10:00.000Z",
          preferredDeliveryHour: 9,
          timeZone: "Europe/Berlin",
        },
        now,
      ),
    ).toBe(false);
  });
});
