package com.djngoma.devilsaidictionary

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

class DailyWordNotificationSchedulerTest {
    @Test
    fun nextLocalDeliveryTimeUsesSameDayWhenHourIsStillAhead() {
        val timeZoneId = "Africa/Johannesburg"
        val nowMs = timestampMs(timeZoneId, 2026, 4, 18, 8, 30)

        val scheduledAtMs = nextLocalDeliveryTime(
            nowMs = nowMs,
            preferredDeliveryHour = 9,
            deviceTimeZoneId = timeZoneId,
        )

        assertEquals(
            timestampMs(timeZoneId, 2026, 4, 18, 9, 0),
            scheduledAtMs,
        )
    }

    @Test
    fun nextLocalDeliveryTimeRollsForwardAfterTheHourHasPassed() {
        val timeZoneId = "Africa/Johannesburg"
        val nowMs = timestampMs(timeZoneId, 2026, 4, 18, 9, 15)

        val scheduledAtMs = nextLocalDeliveryTime(
            nowMs = nowMs,
            preferredDeliveryHour = 9,
            deviceTimeZoneId = timeZoneId,
        )

        assertEquals(
            timestampMs(timeZoneId, 2026, 4, 19, 9, 0),
            scheduledAtMs,
        )
    }

    @Test
    fun planNextDailyWordAlarmSkipsAnAlreadyDeliveredEditorialDate() {
        val timeZoneId = "Africa/Johannesburg"
        val nowMs = timestampMs(timeZoneId, 2026, 4, 18, 8, 45)

        val schedule = planNextDailyWordAlarm(
            nowMs = nowMs,
            preferredDeliveryHour = 9,
            deviceTimeZoneId = timeZoneId,
            editorialTimeZoneId = timeZoneId,
            lastDeliveredEditorialDateKey = "2026-04-18",
        )

        assertEquals(
            timestampMs(timeZoneId, 2026, 4, 19, 9, 0),
            schedule.fireAtMs,
        )
        assertEquals("2026-04-19", schedule.editorialDateKey)
    }

    @Test
    fun editorialDateKeyAtUsesTheEditorialTimezone() {
        val timestampMs = timestampMs("UTC", 2026, 4, 18, 0, 30)

        assertEquals(
            "2026-04-18",
            editorialDateKeyAt(
                timestampMs = timestampMs,
                editorialTimeZoneId = "Africa/Johannesburg",
            ),
        )
        assertEquals(
            "2026-04-17",
            editorialDateKeyAt(
                timestampMs = timestampMs,
                editorialTimeZoneId = "America/Los_Angeles",
            ),
        )
    }

    @Test
    fun collapseNotificationBodyNormalizesWhitespace() {
        val collapsed = collapseNotificationBody("  Too\n\nmuch\t\tspace   here  ")

        assertEquals("Too much space here", collapsed)
        assertTrue(collapsed.none(Char::isWhitespace) || collapsed.contains(" "))
    }

    private fun timestampMs(
        timeZoneId: String,
        year: Int,
        month: Int,
        day: Int,
        hour: Int,
        minute: Int,
    ): Long =
        Calendar.getInstance(TimeZone.getTimeZone(timeZoneId), Locale.US).apply {
            set(Calendar.YEAR, year)
            set(Calendar.MONTH, month - 1)
            set(Calendar.DAY_OF_MONTH, day)
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }.timeInMillis
}
