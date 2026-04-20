package com.djngoma.devilsaidictionary

import android.Manifest
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import java.util.TimeZone

enum class PushOptInStatus(val wireValue: String) {
    authorized("authorized"),
    denied("denied"),
    notDetermined("notDetermined"),
    unsupported("unsupported"),
    unknown("unknown"),
}

class PhonePushManager(
    context: Context,
    private val storage: SharedPreferences,
) {
    private val appContext = context.applicationContext
    private val catalogDiskStore = CatalogDiskStore(appContext)

    @Volatile
    var optInStatus: PushOptInStatus = systemOptInStatus()
        private set

    @Volatile
    var fcmToken: String? = storage.getString(TOKEN_KEY, null)
        private set

    @Volatile
    var lastSchedulingError: String? = storage.getString(LAST_SCHEDULING_ERROR_KEY, null)
        private set

    @Volatile
    var scheduledCatalogVersion: String? = storage.getString(SCHEDULED_CATALOG_VERSION_KEY, null)
        private set

    @Volatile
    var scheduledDeliveryHour: Int? = storage.intOrNull(SCHEDULED_DELIVERY_HOUR_KEY)
        private set

    @Volatile
    var scheduledTimeZoneId: String? = storage.getString(SCHEDULED_TIME_ZONE_KEY, null)
        private set

    @Volatile
    var nextScheduledFireAtMs: Long? = storage.longOrNull(NEXT_SCHEDULED_FIRE_AT_MS_KEY)
        private set

    @Volatile
    var nextScheduledEditorialDateKey: String? = storage.getString(NEXT_SCHEDULED_EDITORIAL_DATE_KEY, null)
        private set

    @Volatile
    var lastDeliveredEditorialDateKey: String? = storage.getString(LAST_DELIVERED_EDITORIAL_DATE_KEY, null)
        private set

    val notificationsPreferenceConfigured: Boolean
        get() = storage.contains(NOTIFICATIONS_PREFERENCE_KEY)

    val notificationsPreferenceEnabled: Boolean
        get() = storedNotificationsPreferenceEnabled() ?: inferredNotificationsPreferenceEnabled(optInStatus)

    val preferredDeliveryHour: Int
        get() = storage
            .getInt(PREFERRED_DELIVERY_HOUR_KEY, DEFAULT_PREFERRED_DELIVERY_HOUR)
            .coerceIn(0, 23)

    val notificationsEnabled: Boolean
        get() = notificationsPreferenceEnabled && optInStatus.canDeliver

    fun refresh() {
        optInStatus = systemOptInStatus()
        syncLocalSchedule()
    }

    fun handleNewFcmToken(token: String) {
        fcmToken = token
        storage.edit().putString(TOKEN_KEY, token).apply()
    }

    fun handleLocalDailyWordAlarm(
        scheduledFireAtMs: Long?,
        editorialDateKey: String?,
    ) {
        optInStatus = systemOptInStatus()
        if (!notificationsEnabled) {
            cancelScheduledDailyWord(clearScheduleMetadata = true)
            clearLastSchedulingError()
            return
        }

        val fireAtMs = scheduledFireAtMs ?: nextScheduledFireAtMs ?: System.currentTimeMillis()
        val snapshot = loadLatestCatalogSnapshot()
        if (snapshot == null) {
            recordSchedulingError("The on-device catalogue could not be loaded for the daily notification.")
            syncLocalSchedule()
            return
        }

        val entry = snapshot.catalog.dailyWordAt(fireAtMs)
        if (entry == null) {
            recordSchedulingError("The on-device catalogue had no daily word for the scheduled delivery.")
            syncLocalSchedule()
            return
        }

        val resolvedEditorialDateKey = editorialDateKey
            ?: editorialDateKeyAt(fireAtMs, snapshot.catalog.editorialTimeZone)

        if (resolvedEditorialDateKey == lastDeliveredEditorialDateKey) {
            syncLocalSchedule()
            return
        }

        DailyWordNotifications.showEntryNotification(
            context = appContext,
            slug = entry.slug,
            title = entry.title,
            body = collapseNotificationBody(entry.devilDefinition),
            source = CurrentWordSource.localNotification,
            editorialDateKey = resolvedEditorialDateKey,
        )
        lastDeliveredEditorialDateKey = resolvedEditorialDateKey
        storage.edit().putString(LAST_DELIVERED_EDITORIAL_DATE_KEY, resolvedEditorialDateKey).apply()
        clearLastSchedulingError()
        syncLocalSchedule()
    }

    fun recordPermissionResult(granted: Boolean) {
        optInStatus = if (granted) PushOptInStatus.authorized else PushOptInStatus.denied
        syncLocalSchedule()
    }

    fun setNotificationsPreferenceEnabled(enabled: Boolean) {
        storage.edit().putBoolean(NOTIFICATIONS_PREFERENCE_KEY, enabled).apply()
        optInStatus = systemOptInStatus()
        syncLocalSchedule()
    }

    fun setPreferredDeliveryHour(hour: Int) {
        storage.edit()
            .putInt(PREFERRED_DELIVERY_HOUR_KEY, hour.coerceIn(0, 23))
            .apply()
        optInStatus = systemOptInStatus()
        syncLocalSchedule()
    }

    fun systemOptInStatus(): PushOptInStatus {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = ContextCompat.checkSelfPermission(
                appContext,
                Manifest.permission.POST_NOTIFICATIONS,
            ) == PackageManager.PERMISSION_GRANTED
            if (granted) return PushOptInStatus.authorized
            return PushOptInStatus.notDetermined
        }

        val areEnabled = NotificationManagerCompat.from(appContext).areNotificationsEnabled()
        return if (areEnabled) PushOptInStatus.authorized else PushOptInStatus.denied
    }

    private fun syncLocalSchedule(nowMs: Long = System.currentTimeMillis()) {
        if (!notificationsEnabled) {
            cancelScheduledDailyWord(clearScheduleMetadata = true)
            clearLastSchedulingError()
            return
        }

        val alarmManager = appContext.getSystemService(AlarmManager::class.java)
        if (alarmManager == null) {
            recordSchedulingError("AlarmManager is unavailable on this device.")
            cancelScheduledDailyWord(clearScheduleMetadata = false)
            return
        }

        val snapshot = loadLatestCatalogSnapshot()
        if (snapshot == null) {
            recordSchedulingError("The on-device catalogue could not be loaded for scheduling.")
            cancelScheduledDailyWord(clearScheduleMetadata = false)
            return
        }

        val deviceTimeZoneId = TimeZone.getDefault().id
        val schedule = planNextDailyWordAlarm(
            nowMs = nowMs,
            preferredDeliveryHour = preferredDeliveryHour,
            deviceTimeZoneId = deviceTimeZoneId,
            editorialTimeZoneId = snapshot.catalog.editorialTimeZone,
            lastDeliveredEditorialDateKey = lastDeliveredEditorialDateKey,
        )

        if (matchesScheduledState(snapshot.catalogVersion, deviceTimeZoneId, schedule, nowMs)) {
            clearLastSchedulingError()
            return
        }

        val pendingIntent = DailyWordNotifications.alarmPendingIntent(
            context = appContext,
            scheduledFireAtMs = schedule.fireAtMs,
            editorialDateKey = schedule.editorialDateKey,
            flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        DailyWordNotifications.existingAlarmPendingIntent(appContext)?.let { existing ->
            alarmManager.cancel(existing)
            existing.cancel()
        }
        alarmManager.setAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            schedule.fireAtMs,
            pendingIntent,
        )

        scheduledCatalogVersion = snapshot.catalogVersion
        scheduledDeliveryHour = preferredDeliveryHour
        scheduledTimeZoneId = deviceTimeZoneId
        nextScheduledFireAtMs = schedule.fireAtMs
        nextScheduledEditorialDateKey = schedule.editorialDateKey
        storage.edit()
            .putString(SCHEDULED_CATALOG_VERSION_KEY, snapshot.catalogVersion)
            .putInt(SCHEDULED_DELIVERY_HOUR_KEY, preferredDeliveryHour)
            .putString(SCHEDULED_TIME_ZONE_KEY, deviceTimeZoneId)
            .putLong(NEXT_SCHEDULED_FIRE_AT_MS_KEY, schedule.fireAtMs)
            .putString(NEXT_SCHEDULED_EDITORIAL_DATE_KEY, schedule.editorialDateKey)
            .apply()
        clearLastSchedulingError()
    }

    private fun loadLatestCatalogSnapshot(): CatalogSnapshot? {
        catalogDiskStore.readCatalogBytes()?.let { bytes ->
            runCatching { parseCatalogSnapshot(bytes) }
                .getOrNull()
                ?.let { return it }
        }

        return runCatching {
            appContext.assets.open(BUNDLED_CATALOG_ASSET_PATH).use { stream ->
                parseCatalogSnapshot(stream.readBytes())
            }
        }.getOrNull()
    }

    private fun cancelScheduledDailyWord(clearScheduleMetadata: Boolean) {
        val alarmManager = appContext.getSystemService(AlarmManager::class.java)
        DailyWordNotifications.existingAlarmPendingIntent(appContext)?.let { pendingIntent ->
            alarmManager?.cancel(pendingIntent)
            pendingIntent.cancel()
        }

        nextScheduledFireAtMs = null
        nextScheduledEditorialDateKey = null

        val editor = storage.edit()
            .remove(NEXT_SCHEDULED_FIRE_AT_MS_KEY)
            .remove(NEXT_SCHEDULED_EDITORIAL_DATE_KEY)

        if (clearScheduleMetadata) {
            scheduledCatalogVersion = null
            scheduledDeliveryHour = null
            scheduledTimeZoneId = null
            editor
                .remove(SCHEDULED_CATALOG_VERSION_KEY)
                .remove(SCHEDULED_DELIVERY_HOUR_KEY)
                .remove(SCHEDULED_TIME_ZONE_KEY)
        }

        editor.apply()
    }

    private fun matchesScheduledState(
        catalogVersion: String,
        deviceTimeZoneId: String,
        schedule: ScheduledDailyWordAlarm,
        nowMs: Long,
    ): Boolean =
        lastSchedulingError == null &&
            scheduledCatalogVersion == catalogVersion &&
            scheduledDeliveryHour == preferredDeliveryHour &&
            scheduledTimeZoneId == deviceTimeZoneId &&
            nextScheduledFireAtMs == schedule.fireAtMs &&
            nextScheduledEditorialDateKey == schedule.editorialDateKey &&
            schedule.fireAtMs > nowMs

    private fun recordSchedulingError(message: String) {
        lastSchedulingError = message
        storage.edit().putString(LAST_SCHEDULING_ERROR_KEY, message).apply()
    }

    private fun clearLastSchedulingError() {
        if (lastSchedulingError == null) {
            return
        }

        lastSchedulingError = null
        storage.edit().remove(LAST_SCHEDULING_ERROR_KEY).apply()
    }

    private fun storedNotificationsPreferenceEnabled(): Boolean? {
        if (!storage.contains(NOTIFICATIONS_PREFERENCE_KEY)) {
            return null
        }

        return storage.getBoolean(NOTIFICATIONS_PREFERENCE_KEY, false)
    }

    private fun inferredNotificationsPreferenceEnabled(status: PushOptInStatus): Boolean =
        status.canDeliver

    companion object {
        private const val BUNDLED_CATALOG_ASSET_PATH = "entries.generated.json"
        private const val DEFAULT_PREFERRED_DELIVERY_HOUR = 9
        private const val LAST_DELIVERED_EDITORIAL_DATE_KEY = "push-last-delivered-editorial-date-key"
        private const val LAST_SCHEDULING_ERROR_KEY = "push-last-scheduling-error"
        private const val NEXT_SCHEDULED_EDITORIAL_DATE_KEY = "push-next-scheduled-editorial-date-key"
        private const val NEXT_SCHEDULED_FIRE_AT_MS_KEY = "push-next-scheduled-fire-at-ms"
        private const val NOTIFICATIONS_PREFERENCE_KEY = "notifications-preference-enabled"
        private const val PREFERRED_DELIVERY_HOUR_KEY = "preferred-delivery-hour"
        private const val SCHEDULED_CATALOG_VERSION_KEY = "push-scheduled-catalog-version"
        private const val SCHEDULED_DELIVERY_HOUR_KEY = "push-scheduled-delivery-hour"
        private const val SCHEDULED_TIME_ZONE_KEY = "push-scheduled-time-zone"
        private const val SHARED_PREFERENCES_NAME = "native-dictionary-store"
        private const val TOKEN_KEY = "fcm-device-token"

        fun from(context: Context): PhonePushManager =
            PhonePushManager(
                context = context.applicationContext,
                storage = context.applicationContext.getSharedPreferences(
                    SHARED_PREFERENCES_NAME,
                    Context.MODE_PRIVATE,
                ),
            )
    }
}

private val PushOptInStatus.canDeliver: Boolean
    get() = this == PushOptInStatus.authorized

private fun SharedPreferences.longOrNull(key: String): Long? =
    if (contains(key)) getLong(key, 0L) else null

private fun SharedPreferences.intOrNull(key: String): Int? =
    if (contains(key)) getInt(key, 0) else null
