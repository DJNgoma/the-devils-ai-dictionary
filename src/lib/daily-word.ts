import {
  diffEditorialDays,
  getEditorialIsoDate,
} from "@/lib/editorial-calendar";

export type DailyWordSchedule = {
  dailyWordSlugs: string[];
  dailyWordStartDate: string;
  editorialTimeZone: string;
};

export type FeaturedEntrySchedule = DailyWordSchedule & {
  recentSlugs: string[];
  featuredSlug?: string;
};

export function getDailyWordIndex(
  schedule: DailyWordSchedule,
  referenceDate: Date = new Date(),
) {
  if (schedule.dailyWordSlugs.length === 0) {
    return null;
  }

  const currentEditorialDate = getEditorialIsoDate(
    referenceDate,
    schedule.editorialTimeZone,
  );
  const elapsedDays = Math.max(
    0,
    diffEditorialDays(schedule.dailyWordStartDate, currentEditorialDate),
  );

  return elapsedDays % schedule.dailyWordSlugs.length;
}

export function getDailyWordSlug(
  schedule: DailyWordSchedule,
  referenceDate: Date = new Date(),
) {
  const index = getDailyWordIndex(schedule, referenceDate);

  return index === null ? null : schedule.dailyWordSlugs[index];
}

export function getFeaturedEntrySlug(
  schedule: FeaturedEntrySchedule,
  referenceDate: Date = new Date(),
) {
  const todaySlug = getDailyWordSlug(schedule, referenceDate);
  const candidates = schedule.recentSlugs.filter((slug) => slug !== todaySlug);

  if (candidates.length === 0) {
    return todaySlug ?? schedule.featuredSlug ?? null;
  }

  const currentEditorialDate = getEditorialIsoDate(
    referenceDate,
    schedule.editorialTimeZone,
  );
  const elapsedDays = Math.max(
    0,
    diffEditorialDays(schedule.dailyWordStartDate, currentEditorialDate),
  );
  const elapsedWeeks = Math.floor(elapsedDays / 7);

  return candidates[elapsedWeeks % candidates.length] ?? schedule.featuredSlug ?? null;
}
