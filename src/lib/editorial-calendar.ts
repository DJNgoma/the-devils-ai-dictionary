const MS_PER_DAY = 86_400_000;

export type EditorialDateParts = {
  year: number;
  month: number;
  day: number;
};

export function getEditorialDateParts(
  value: Date | string,
  timeZone: string,
): EditorialDateParts {
  const date = typeof value === "string" ? new Date(value) : value;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    throw new Error(`Could not resolve editorial date in ${timeZone}.`);
  }

  return {
    year,
    month,
    day,
  };
}

export function toIsoDate({ year, month, day }: EditorialDateParts) {
  return [
    year.toString().padStart(4, "0"),
    month.toString().padStart(2, "0"),
    day.toString().padStart(2, "0"),
  ].join("-");
}

export function getEditorialIsoDate(value: Date | string, timeZone: string) {
  return toIsoDate(getEditorialDateParts(value, timeZone));
}

export function isoDateToDayNumber(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    throw new Error(`Invalid ISO date "${value}".`);
  }

  return Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

export function diffEditorialDays(startIsoDate: string, endIsoDate: string) {
  return isoDateToDayNumber(endIsoDate) - isoDateToDayNumber(startIsoDate);
}

export function shiftIsoDate(value: string, offsetDays: number) {
  return toIsoDate(
    dayNumberToEditorialDateParts(isoDateToDayNumber(value) + offsetDays),
  );
}

export function getWeekdayInTimeZone(value: Date | string, timeZone: string) {
  const parts = getEditorialDateParts(value, timeZone);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

function dayNumberToEditorialDateParts(dayNumber: number): EditorialDateParts {
  const date = new Date(dayNumber * MS_PER_DAY);

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}
