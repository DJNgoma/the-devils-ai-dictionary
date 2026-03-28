import { describe, expect, it } from "vitest";
import {
  getMobileBackHref,
  getMobileChromeTitle,
  getMobilePrimaryNavId,
  isMobilePrimaryNavActive,
} from "@/lib/site";
import { resolveAndroidBackAction } from "@/lib/mobile-shell";

describe("mobile navigation helpers", () => {
  it("maps home-adjacent routes to the home tab", () => {
    expect(getMobilePrimaryNavId("/")).toBe("home");
    expect(getMobilePrimaryNavId("/book")).toBe("home");
    expect(getMobilePrimaryNavId("/about")).toBe("home");
  });

  it("maps browse routes to the browse tab", () => {
    expect(getMobilePrimaryNavId("/dictionary")).toBe("browse");
    expect(getMobilePrimaryNavId("/dictionary/agent")).toBe("browse");
    expect(getMobilePrimaryNavId("/categories/model-building")).toBe("browse");
  });

  it("returns readable chrome titles", () => {
    expect(getMobileChromeTitle("/dictionary/agent")).toBe("Entry");
    expect(getMobileChromeTitle("/categories")).toBe("Categories");
    expect(getMobileChromeTitle("/saved")).toBe("Saved");
  });

  it("provides back destinations for detail routes", () => {
    expect(getMobileBackHref("/dictionary/agent")).toBe("/dictionary");
    expect(getMobileBackHref("/categories/model-building")).toBe("/categories");
    expect(getMobileBackHref("/search")).toBeNull();
  });

  it("reports active mobile tabs", () => {
    expect(isMobilePrimaryNavActive("/dictionary", "browse")).toBe(true);
    expect(isMobilePrimaryNavActive("/search", "search")).toBe(true);
    expect(isMobilePrimaryNavActive("/saved", "home")).toBe(false);
  });
});

describe("resolveAndroidBackAction", () => {
  it("closes sheets before navigating", () => {
    expect(
      resolveAndroidBackAction({ hasOpenSheet: true, canGoBack: true }),
    ).toBe("close-sheet");
  });

  it("uses history when there is no open sheet and history exists", () => {
    expect(
      resolveAndroidBackAction({ hasOpenSheet: false, canGoBack: true }),
    ).toBe("history-back");
  });

  it("minimizes the app at the root of the history stack", () => {
    expect(
      resolveAndroidBackAction({ hasOpenSheet: false, canGoBack: false }),
    ).toBe("minimize-app");
  });
});
