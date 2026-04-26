import { describe, expect, it } from "vitest";
import { shouldShowDeveloperSettings } from "@/lib/feature-flags";

describe("feature flags", () => {
  it("shows developer settings in local development", () => {
    expect(shouldShowDeveloperSettings({ NODE_ENV: "development" })).toBe(true);
  });

  it("hides developer settings in production by default", () => {
    expect(shouldShowDeveloperSettings({ NODE_ENV: "production" })).toBe(false);
  });

  it("shows developer settings in staging or preview production builds", () => {
    expect(
      shouldShowDeveloperSettings({ APP_ENV: "staging", NODE_ENV: "production" }),
    ).toBe(true);
    expect(
      shouldShowDeveloperSettings({ NODE_ENV: "production", VERCEL_ENV: "preview" }),
    ).toBe(true);
    expect(
      shouldShowDeveloperSettings({ CF_PAGES_BRANCH: "codex/test", NODE_ENV: "production" }),
    ).toBe(true);
  });

  it("honors explicit developer settings overrides", () => {
    expect(
      shouldShowDeveloperSettings({
        NODE_ENV: "development",
        SHOW_DEVELOPER_SETTINGS: "false",
      }),
    ).toBe(false);
    expect(
      shouldShowDeveloperSettings({
        NODE_ENV: "production",
        SHOW_DEVELOPER_SETTINGS: "true",
      }),
    ).toBe(true);
  });

  it("keeps the old saved-word sync override as a compatibility alias", () => {
    expect(
      shouldShowDeveloperSettings({
        NODE_ENV: "production",
        SHOW_SAVED_WORDS_SYNC: "true",
      }),
    ).toBe(true);
  });
});
