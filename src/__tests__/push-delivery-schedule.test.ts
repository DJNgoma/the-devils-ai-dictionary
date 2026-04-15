import { describe, expect, it } from "vitest";
import {
  defaultPushDeliveryHour,
  getPushInstallationDeliveryDateKey,
  hasPushInstallationDeliveredForDateKey,
  isPushInstallationInDeliveryWindow,
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
          lastSuccessDateKey: null,
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
          lastSuccessDateKey: null,
          preferredDeliveryHour: 7,
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
          lastSuccessDateKey: null,
          preferredDeliveryHour: 9,
          timeZone: "Europe/Berlin",
        },
        now,
      ),
    ).toBe(false);
  });

  it("keeps installations due within the configured late window", () => {
    const now = new Date("2026-04-11T08:15:00.000Z");

    expect(
      isPushInstallationInDeliveryWindow(
        {
          preferredDeliveryHour: 9,
          timeZone: "Europe/Berlin",
        },
        now,
      ),
    ).toBe(true);
  });

  it("stops treating the installation as due once the late window has passed", () => {
    const now = new Date("2026-04-11T08:30:00.000Z");

    expect(
      isPushInstallationDueNow(
        {
          lastSuccessAt: null,
          lastSuccessDateKey: null,
          preferredDeliveryHour: 9,
          timeZone: "Europe/Berlin",
        },
        now,
      ),
    ).toBe(false);
  });

  it("prefers the stored local delivery key when one exists", () => {
    const now = new Date("2026-04-11T07:00:00.000Z");
    const deliveryDateKey = getPushInstallationDeliveryDateKey(
      { timeZone: "Europe/Berlin" },
      now,
    );

    expect(
      hasPushInstallationDeliveredForDateKey(
        {
          lastSuccessAt: "2026-04-10T06:59:00.000Z",
          lastSuccessDateKey: deliveryDateKey,
          timeZone: "Europe/Berlin",
        },
        deliveryDateKey,
      ),
    ).toBe(true);
  });
});
