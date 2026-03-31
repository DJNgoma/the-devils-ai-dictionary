// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  isAppleMobileDevice,
  OpenInIPhoneAppButton,
} from "@/components/open-in-iphone-app-button";

function setNavigator({
  userAgent,
  platform,
  maxTouchPoints,
}: {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
}) {
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value: userAgent,
  });
  Object.defineProperty(window.navigator, "platform", {
    configurable: true,
    value: platform,
  });
  Object.defineProperty(window.navigator, "maxTouchPoints", {
    configurable: true,
    value: maxTouchPoints,
  });
}

describe("isAppleMobileDevice", () => {
  it("recognizes iPhone user agents directly", () => {
    expect(
      isAppleMobileDevice(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
      ),
    ).toBe(true);
  });

  it("recognizes iPadOS Safari on touch-capable MacIntel devices", () => {
    expect(
      isAppleMobileDevice(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)",
        "MacIntel",
        5,
      ),
    ).toBe(true);
  });

  it("ignores desktop browsers", () => {
    expect(
      isAppleMobileDevice(
        "Mozilla/5.0 (X11; Linux x86_64)",
        "Linux x86_64",
        0,
      ),
    ).toBe(false);
  });
});

describe("OpenInIPhoneAppButton", () => {
  it("stays hidden on non-Apple devices", () => {
    setNavigator({
      userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel 9)",
      platform: "Linux armv8l",
      maxTouchPoints: 5,
    });

    render(<OpenInIPhoneAppButton slug="agent" />);

    expect(screen.queryByRole("link", { name: "Open in iPhone app" })).toBeNull();
  });

  it("renders the custom deep link on iPhone and iPad devices", async () => {
    setNavigator({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
      platform: "iPhone",
      maxTouchPoints: 5,
    });

    render(<OpenInIPhoneAppButton slug="agent" />);

    const link = await screen.findByRole("link", { name: "Open in iPhone app" });
    expect(link.getAttribute("href")).toBe("devilsaidictionary://dictionary/agent");
  });
});
