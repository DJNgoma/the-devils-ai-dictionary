import { describe, expect, it, vi } from "vitest";
import { cn, formatCount, formatDate, slugify, uniqueBy } from "@/lib/utils";

describe("slugify", () => {
  it("lowercases, swaps ampersands, and trims edge dashes", () => {
    expect(slugify("  AI & Ops!  ")).toBe("ai-and-ops");
    expect(slugify("Fine-tuning 101")).toBe("fine-tuning-101");
  });

  it("collapses runs of separators into a single dash", () => {
    expect(slugify("model // training --- 2025")).toBe("model-training-2025");
  });

  it("returns an empty string for inputs with no slug-safe characters", () => {
    expect(slugify("")).toBe("");
    expect(slugify("***")).toBe("");
    expect(slugify("   ")).toBe("");
  });

  it("strips characters outside [a-z0-9] including accented letters", () => {
    expect(slugify("Caf\u00e9 Ol\u00e9")).toBe("caf-ol");
    expect(slugify("na\u00efve r\u00e9sum\u00e9")).toBe("na-ve-r-sum");
  });

  it("expands every ampersand it sees, even when adjacent", () => {
    expect(slugify("R&D & ops")).toBe("r-and-d-and-ops");
  });
});

describe("formatDate", () => {
  it("renders ISO timestamps in the en-ZA short-month format", () => {
    expect(formatDate("2026-03-20T12:00:00Z")).toBe("20 Mar 2026");
  });
});

describe("formatCount", () => {
  it("groups thousands with the en-ZA narrow no-break space", () => {
    expect(formatCount(1234)).toBe("1\u00a0234");
    expect(formatCount(1234567)).toBe("1\u00a0234\u00a0567");
  });

  it("formats zero and negatives without surprises", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(-2048)).toBe("-2\u00a0048");
  });
});

describe("uniqueBy", () => {
  it("preserves the first occurrence and drops later duplicates", () => {
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

  it("returns an empty array for empty input without invoking the key fn", () => {
    const key = vi.fn<(item: { id: string }) => string>();
    expect(uniqueBy<{ id: string }>([], key)).toEqual([]);
    expect(key).not.toHaveBeenCalled();
  });

  it("returns the input untouched when every key is unique", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(uniqueBy(items, (item) => item.id)).toEqual(items);
  });
});

describe("cn", () => {
  it("merges Tailwind utility classes with later ones winning", () => {
    expect(cn("px-2", "px-4", "text-sm", false && "hidden")).toBe("px-4 text-sm");
  });
});
