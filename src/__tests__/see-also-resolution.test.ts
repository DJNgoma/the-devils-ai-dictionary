import { describe, expect, it } from "vitest";
import { resolveEntryReference } from "@/lib/content";

describe("resolveEntryReference", () => {
  it("matches alias-only see-also labels to existing entries", async () => {
    await expect(resolveEntryReference("Copilot")).resolves.toMatchObject({
      slug: "microsoft-copilot",
    });
    await expect(resolveEntryReference("Open Weights")).resolves.toMatchObject({
      slug: "open-weight",
    });
  });

  it("resolves newly added hardware terms directly", async () => {
    await expect(resolveEntryReference("GPU")).resolves.toMatchObject({
      slug: "gpu",
    });
    await expect(resolveEntryReference("DGX")).resolves.toMatchObject({
      slug: "dgx",
    });
  });
});
