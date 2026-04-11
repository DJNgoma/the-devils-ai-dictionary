import type { PushInstallationRecord } from "@/lib/server/push-installations";

export const defaultPushDeliveryHour = 9;
export const fallbackPushTimeZone = "Africa/Johannesburg";

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();
const hourFormatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterForDate(timeZone: string) {
  let formatter = dateFormatterCache.get(timeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    dateFormatterCache.set(timeZone, formatter);
  }

  return formatter;
}

function formatterForHour(timeZone: string) {
  let formatter = hourFormatterCache.get(timeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      hour12: false,
    });
    hourFormatterCache.set(timeZone, formatter);
  }

  return formatter;
}

export function normalizePreferredDeliveryHour(hour: number | null | undefined) {
  if (
    typeof hour === "number" &&
    Number.isInteger(hour) &&
    hour >= 0 &&
    hour <= 23
  ) {
    return hour;
  }

  return defaultPushDeliveryHour;
}

export function normalizePushTimeZone(timeZone: string | null | undefined) {
  if (!timeZone) {
    return fallbackPushTimeZone;
  }

  try {
    Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return fallbackPushTimeZone;
  }
}

function localDateKey(date: Date, timeZone: string) {
  return formatterForDate(timeZone).format(date);
}

function localHour(date: Date, timeZone: string) {
  return Number(formatterForHour(timeZone).format(date));
}

export function isPushInstallationDueNow(
  installation: Pick<
    PushInstallationRecord,
    "lastSuccessAt" | "preferredDeliveryHour" | "timeZone"
  >,
  now: Date,
) {
  const timeZone = normalizePushTimeZone(installation.timeZone);
  const preferredDeliveryHour = normalizePreferredDeliveryHour(
    installation.preferredDeliveryHour,
  );

  if (localHour(now, timeZone) !== preferredDeliveryHour) {
    return false;
  }

  if (!installation.lastSuccessAt) {
    return true;
  }

  const lastSuccessAt = new Date(installation.lastSuccessAt);

  if (Number.isNaN(lastSuccessAt.getTime())) {
    return true;
  }

  return localDateKey(lastSuccessAt, timeZone) !== localDateKey(now, timeZone);
}
