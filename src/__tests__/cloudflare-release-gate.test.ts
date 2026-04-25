import { describe, expect, it } from "vitest";

import {
  assertBudget,
  parseWranglerGzipBytes,
} from "../../scripts/cloudflare-release-gate.mjs";

describe("Cloudflare release gate helpers", () => {
  it("parses Wrangler compressed upload size", () => {
    expect(
      parseWranglerGzipBytes("Total Upload: 10068.90 KiB / gzip: 2295.79 KiB"),
    ).toBeCloseTo(2295.79 * 1024);
  });

  it("throws when a budget is exceeded", () => {
    expect(() => assertBudget("Worker gzip bundle", 11, 10)).toThrow(
      /Worker gzip bundle/,
    );
  });
});
