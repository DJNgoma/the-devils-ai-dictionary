import { describe, expect, it } from "vitest";
import { getDailyWordIndex, getDailyWordSlug } from "@/lib/daily-word";

const schedule = {
  dailyWordSlugs: ["fine-tuning", "tokens", "prompt"],
  dailyWordStartDate: "2026-03-03",
  editorialTimeZone: "Africa/Johannesburg",
};

function makeUtcDateForScheduleDay(offsetDays: number, hour = 10) {
  return new Date(Date.UTC(2026, 2, 3 + offsetDays, hour));
}

describe("daily-word schedule helpers", () => {
  it("starts on the first scheduled slug", () => {
    expect(getDailyWordIndex(schedule, makeUtcDateForScheduleDay(0))).toBe(0);
    expect(getDailyWordSlug(schedule, makeUtcDateForScheduleDay(0))).toBe(
      "fine-tuning",
    );
  });

  it("rolls over at midnight in the editorial timezone", () => {
    const beforeMidnightInJohannesburg = new Date("2026-03-03T21:59:59Z");
    const atMidnightInJohannesburg = new Date("2026-03-03T22:00:00Z");

    expect(getDailyWordSlug(schedule, beforeMidnightInJohannesburg)).toBe(
      "fine-tuning",
    );
    expect(getDailyWordSlug(schedule, atMidnightInJohannesburg)).toBe("tokens");
  });

  it("does not repeat before the schedule wraps", () => {
    const firstCycle = schedule.dailyWordSlugs.map((_, index) =>
      getDailyWordSlug(schedule, makeUtcDateForScheduleDay(index)),
    );

    expect(firstCycle).toEqual(schedule.dailyWordSlugs);
    expect(new Set(firstCycle).size).toBe(schedule.dailyWordSlugs.length);
  });

  it("wraps back to the start after the full catalogue run", () => {
    expect(
      getDailyWordSlug(
        schedule,
        makeUtcDateForScheduleDay(schedule.dailyWordSlugs.length),
      ),
    ).toBe("fine-tuning");
  });
});
