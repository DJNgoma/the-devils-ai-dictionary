import { describe, expect, it } from "vitest";
import {
  assertBuildNumber,
  assertMarketingVersion,
  createWindowsBuildVersion,
  readSharedVersionConfig,
} from "../../scripts/shared-versioning.mjs";

describe("shared release versioning", () => {
  it("accepts x.y.z marketing versions", () => {
    expect(() => assertMarketingVersion("1.2.3")).not.toThrow();
  });

  it("rejects invalid marketing versions", () => {
    expect(() => assertMarketingVersion("1.2")).toThrow(/x\.y\.z/);
    expect(() => assertMarketingVersion("v1.2.3")).toThrow(/x\.y\.z/);
  });

  it("accepts positive integer build numbers", () => {
    expect(() => assertBuildNumber(5)).not.toThrow();
  });

  it("rejects invalid build numbers", () => {
    expect(() => assertBuildNumber(0)).toThrow(/positive integer/);
    expect(() => assertBuildNumber(1.5)).toThrow(/positive integer/);
  });

  it("derives the Windows build version from the shared release numbers", () => {
    expect(createWindowsBuildVersion("1.2.3", 45)).toBe("1.2.3.45");
  });

  it("reads the current repo-wide version config", async () => {
    const versionConfig = await readSharedVersionConfig();

    expect(versionConfig.marketingVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(versionConfig.buildNumber).toBeGreaterThanOrEqual(1);
    expect(versionConfig.windowsBuildVersion).toBe(
      `${versionConfig.marketingVersion}.${versionConfig.buildNumber}`,
    );
  });
});
