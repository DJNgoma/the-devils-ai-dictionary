import { describe, expect, it } from "vitest";
import { cn, formatCount, formatDate, slugify, uniqueBy } from "@/lib/utils";

describe("utility helpers", () => {
  it("slugifies punctuation and ampersands consistently", () => {
    expect(slugify("  AI & Ops!  ")).toBe("ai-and-ops");
    expect(slugify("Fine-tuning 101")).toBe("fine-tuning-101");
  });

  it("formats dates in the project locale", () => {
    expect(formatDate("2026-03-20T12:00:00Z")).toBe("20 Mar 2026");
  });

  it("formats counts in the project locale", () => {
    expect(formatCount(1234)).toBe("1\u00a0234");
  });

  it("deduplicates values while preserving first occurrence order", () => {
    const result = uniqueBy(
      [
        { id: "a", title: "Agent" },
        { id: "b", title: "Batch" },
        { id: "a", title: "Duplicate Agent" },
      ],
      (item) => item.id,
    );

    expect(result).toEqual([
      { id: "a", title: "Agent" },
      { id: "b", title: "Batch" },
    ]);
  });

  it("merges Tailwind utility classes", () => {
    expect(cn("px-2", "px-4", "text-sm", false && "hidden")).toBe("px-4 text-sm");
  });
});
