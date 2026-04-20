package com.djngoma.devilsaidictionary

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

internal object DailyWordNotifications {
    const val ACTION_DELIVER_LOCAL_DAILY_WORD =
        "com.djngoma.devilsaidictionary.action.DELIVER_LOCAL_DAILY_WORD"
    const val EXTRA_EDITORIAL_DATE_KEY = "notification_editorial_date_key"
    const val EXTRA_NOTIFICATION_SLUG = "notification_slug"
    const val EXTRA_NOTIFICATION_SOURCE = "notification_source"
    const val EXTRA_SCHEDULED_FIRE_AT_MS = "notification_scheduled_fire_at_ms"

    private const val DEFAULT_NOTIFICATION_ID = 2027
    private const val LOCAL_ALARM_REQUEST_CODE = 2027

    fun showEntryNotification(
        context: Context,
        slug: String,
        title: String,
        body: String,
        source: CurrentWordSource,
        editorialDateKey: String? = null,
    ) {
        val intent = Intent(context, DictionaryActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(EXTRA_NOTIFICATION_SLUG, slug)
            putExtra(EXTRA_NOTIFICATION_SOURCE, source.name)
            editorialDateKey?.let { putExtra(EXTRA_EDITORIAL_DATE_KEY, it) }
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            notificationRequestCode(slug, editorialDateKey),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(context, DictionaryApplication.DAILY_WORD_CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        NotificationManagerCompat.from(context)
            .notify(notificationId(slug, editorialDateKey), notification)
    }

    fun alarmPendingIntent(
        context: Context,
        scheduledFireAtMs: Long,
        editorialDateKey: String,
        flags: Int,
    ): PendingIntent =
        PendingIntent.getBroadcast(
            context,
            LOCAL_ALARM_REQUEST_CODE,
            Intent(context, DailyWordNotificationReceiver::class.java).apply {
                action = ACTION_DELIVER_LOCAL_DAILY_WORD
                putExtra(EXTRA_SCHEDULED_FIRE_AT_MS, scheduledFireAtMs)
                putExtra(EXTRA_EDITORIAL_DATE_KEY, editorialDateKey)
            },
            flags,
        )

    fun existingAlarmPendingIntent(context: Context): PendingIntent? =
        PendingIntent.getBroadcast(
            context,
            LOCAL_ALARM_REQUEST_CODE,
            Intent(context, DailyWordNotificationReceiver::class.java).apply {
                action = ACTION_DELIVER_LOCAL_DAILY_WORD
            },
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE,
        )

    private fun notificationId(slug: String, editorialDateKey: String?): Int =
        notificationRequestCode(slug, editorialDateKey)
            .takeIf { it != 0 }
            ?: DEFAULT_NOTIFICATION_ID

    private fun notificationRequestCode(slug: String, editorialDateKey: String?): Int =
        (editorialDateKey ?: slug).hashCode()
}

internal fun notificationSourceFrom(raw: String?): CurrentWordSource =
    runCatching { CurrentWordSource.valueOf(raw.orEmpty()) }
        .getOrDefault(CurrentWordSource.notificationTap)
