import { describe, expect, it } from "vitest";
import { resolveEntryReference } from "@/lib/content";

describe("resolveEntryReference", () => {
  it("matches alias-only see-also labels to existing entries", () => {
    expect(resolveEntryReference("Copilot")?.slug).toBe("microsoft-copilot");
    expect(resolveEntryReference("Open Weights")?.slug).toBe("open-weight");
  });

  it("resolves newly added hardware terms directly", () => {
    expect(resolveEntryReference("GPU")?.slug).toBe("gpu");
    expect(resolveEntryReference("DGX")?.slug).toBe("dgx");
  });
});
