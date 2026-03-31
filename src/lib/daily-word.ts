import {
  diffEditorialDays,
  getEditorialIsoDate,
} from "@/lib/editorial-calendar";

export type DailyWordSchedule = {
  dailyWordSlugs: string[];
  dailyWordStartDate: string;
  editorialTimeZone: string;
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
