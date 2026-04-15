import type { PushInstallationRecord } from "@/lib/server/push-installations";

export const defaultPushDeliveryHour = 9;
export const fallbackPushTimeZone = "Africa/Johannesburg";
export const pushDeliveryWindowMinutes = 90;

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();
const timeFormatterCache = new Map<string, Intl.DateTimeFormat>();

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

function formatterForTime(timeZone: string) {
  let formatter = timeFormatterCache.get(timeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    timeFormatterCache.set(timeZone, formatter);
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

function localMinuteOfDay(date: Date, timeZone: string) {
  const time = formatterForTime(timeZone).format(date);
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

type DeliveryScheduleFields = Pick<
  PushInstallationRecord,
  "lastSuccessAt" | "lastSuccessDateKey" | "preferredDeliveryHour" | "timeZone"
>;

export function getPushInstallationDeliveryDateKey(
  installation: Pick<DeliveryScheduleFields, "timeZone">,
  now: Date,
) {
  return localDateKey(now, normalizePushTimeZone(installation.timeZone));
}

export function hasPushInstallationDeliveredForDateKey(
  installation: Pick<DeliveryScheduleFields, "lastSuccessAt" | "lastSuccessDateKey" | "timeZone">,
  deliveryDateKey: string,
) {
  if (installation.lastSuccessDateKey) {
    return installation.lastSuccessDateKey === deliveryDateKey;
  }

  if (!installation.lastSuccessAt) {
    return false;
  }

  const timeZone = normalizePushTimeZone(installation.timeZone);
  const lastSuccessAt = new Date(installation.lastSuccessAt);

  if (Number.isNaN(lastSuccessAt.getTime())) {
    return false;
  }

  return localDateKey(lastSuccessAt, timeZone) === deliveryDateKey;
}

export function isPushInstallationInDeliveryWindow(
  installation: Pick<DeliveryScheduleFields, "preferredDeliveryHour" | "timeZone">,
  now: Date,
) {
  const timeZone = normalizePushTimeZone(installation.timeZone);
  const preferredDeliveryHour = normalizePreferredDeliveryHour(
    installation.preferredDeliveryHour,
  );
  const localMinutes = localMinuteOfDay(now, timeZone);
  const windowStart = preferredDeliveryHour * 60;
  const windowEnd = Math.min(
    windowStart + pushDeliveryWindowMinutes - 1,
    (24 * 60) - 1,
  );

  return localMinutes >= windowStart && localMinutes <= windowEnd;
}

export function isPushInstallationDueNow(
  installation: DeliveryScheduleFields,
  now: Date,
) {
  if (!isPushInstallationInDeliveryWindow(installation, now)) {
    return false;
  }

  return !hasPushInstallationDeliveredForDateKey(
    installation,
    getPushInstallationDeliveryDateKey(installation, now),
  );
}
