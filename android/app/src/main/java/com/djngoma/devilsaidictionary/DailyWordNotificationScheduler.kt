package com.djngoma.devilsaidictionary

import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

internal data class ScheduledDailyWordAlarm(
    val fireAtMs: Long,
    val editorialDateKey: String,
)

internal fun planNextDailyWordAlarm(
    nowMs: Long,
    preferredDeliveryHour: Int,
    deviceTimeZoneId: String,
    editorialTimeZoneId: String,
    lastDeliveredEditorialDateKey: String? = null,
): ScheduledDailyWordAlarm {
    var fireAtMs = nextLocalDeliveryTime(
        nowMs = nowMs,
        preferredDeliveryHour = preferredDeliveryHour,
        deviceTimeZoneId = deviceTimeZoneId,
    )
    var editorialDateKey = editorialDateKeyAt(
        timestampMs = fireAtMs,
        editorialTimeZoneId = editorialTimeZoneId,
    )

    while (editorialDateKey == lastDeliveredEditorialDateKey) {
        fireAtMs = advanceLocalDeliveryTime(
            scheduledFireAtMs = fireAtMs,
            preferredDeliveryHour = preferredDeliveryHour,
            deviceTimeZoneId = deviceTimeZoneId,
        )
        editorialDateKey = editorialDateKeyAt(
            timestampMs = fireAtMs,
            editorialTimeZoneId = editorialTimeZoneId,
        )
    }

    return ScheduledDailyWordAlarm(
        fireAtMs = fireAtMs,
        editorialDateKey = editorialDateKey,
    )
}

internal fun nextLocalDeliveryTime(
    nowMs: Long,
    preferredDeliveryHour: Int,
    deviceTimeZoneId: String,
): Long {
    val calendar = Calendar.getInstance(TimeZone.getTimeZone(deviceTimeZoneId), Locale.US).apply {
        timeInMillis = nowMs
        set(Calendar.HOUR_OF_DAY, preferredDeliveryHour.coerceIn(0, 23))
        set(Calendar.MINUTE, 0)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
    }

    if (calendar.timeInMillis <= nowMs) {
        calendar.add(Calendar.DAY_OF_YEAR, 1)
    }

    return calendar.timeInMillis
}

internal fun advanceLocalDeliveryTime(
    scheduledFireAtMs: Long,
    preferredDeliveryHour: Int,
    deviceTimeZoneId: String,
): Long {
    val calendar = Calendar.getInstance(TimeZone.getTimeZone(deviceTimeZoneId), Locale.US).apply {
        timeInMillis = scheduledFireAtMs
        add(Calendar.DAY_OF_YEAR, 1)
        set(Calendar.HOUR_OF_DAY, preferredDeliveryHour.coerceIn(0, 23))
        set(Calendar.MINUTE, 0)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
    }

    return calendar.timeInMillis
}

internal fun editorialDateKeyAt(
    timestampMs: Long,
    editorialTimeZoneId: String,
): String {
    val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    formatter.timeZone = TimeZone.getTimeZone(editorialTimeZoneId)
    return formatter.format(Date(timestampMs))
}

internal fun collapseNotificationBody(text: String): String =
    text.trim().replace(Regex("\\s+"), " ")
