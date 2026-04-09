import { describe, expect, it } from "vitest";
import {
  diffEditorialDays,
  getEditorialDateParts,
  getEditorialIsoDate,
  getWeekdayInTimeZone,
  isoDateToDayNumber,
  shiftIsoDate,
} from "@/lib/editorial-calendar";

describe("editorial calendar helpers", () => {
  it("rolls the calendar date at midnight in the editorial timezone", () => {
    const timeZone = "Africa/Johannesburg";
    const beforeMidnight = new Date("2026-03-03T21:59:59Z");
    const atMidnight = new Date("2026-03-03T22:00:00Z");

    expect(getEditorialDateParts(beforeMidnight, timeZone)).toEqual({
      year: 2026,
      month: 3,
      day: 3,
    });
    expect(getEditorialIsoDate(beforeMidnight, timeZone)).toBe("2026-03-03");
    expect(getEditorialDateParts(atMidnight, timeZone)).toEqual({
      year: 2026,
      month: 3,
      day: 4,
    });
    expect(getEditorialIsoDate(atMidnight, timeZone)).toBe("2026-03-04");
  });

  it("computes stable day offsets from ISO dates", () => {
    expect(isoDateToDayNumber("2026-03-03")).toBeLessThan(
      isoDateToDayNumber("2026-03-04"),
    );
    expect(diffEditorialDays("2026-03-03", "2026-03-05")).toBe(2);
    expect(shiftIsoDate("2026-03-03", 2)).toBe("2026-03-05");
  });

  it("reads the weekday in the editorial timezone", () => {
    expect(getWeekdayInTimeZone("2026-03-03T00:00:00Z", "Africa/Johannesburg")).toBe(2);
  });
});
