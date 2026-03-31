import {
  getEditorialIsoDate,
  getWeekdayInTimeZone,
  shiftIsoDate,
} from "@/lib/editorial-calendar";
import type { Entry } from "@/lib/content";

export type WeeklyDigest = {
  startDate: string;
  endDate: string;
  entries: Entry[];
};

const TUESDAY = 2;

export function getWeeklyDigest(
  entries: Entry[],
  editorialTimeZone: string,
  referenceDate: Date = new Date(),
): WeeklyDigest {
  const endDate = getEditorialIsoDate(referenceDate, editorialTimeZone);
  const endWeekday = getWeekdayInTimeZone(referenceDate, editorialTimeZone);
  const daysSinceTuesday =
    (endWeekday - TUESDAY + 7) % 7 || 7;
  const startDate = shiftIsoDate(endDate, -daysSinceTuesday);

  const digestEntries = entries
    .filter((entry) => entry.publishedAt >= startDate && entry.publishedAt < endDate)
    .toSorted((left, right) => {
      const publishedOrder = right.publishedAt.localeCompare(left.publishedAt);
      if (publishedOrder !== 0) {
        return publishedOrder;
      }

      return left.slug.localeCompare(right.slug);
    });

  return {
    startDate,
    endDate,
    entries: digestEntries,
  };
}
