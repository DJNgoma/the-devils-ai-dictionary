package com.djngoma.devilsaidictionary

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class DailyWordNotificationReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val pendingResult = goAsync()
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            try {
                val manager = PhonePushManager.from(context)
                when (intent.action) {
                    DailyWordNotifications.ACTION_DELIVER_LOCAL_DAILY_WORD ->
                        manager.handleLocalDailyWordAlarm(
                            scheduledFireAtMs = intent.getLongExtra(
                                DailyWordNotifications.EXTRA_SCHEDULED_FIRE_AT_MS,
                                0L,
                            ).takeIf { it > 0L },
                            editorialDateKey = intent.getStringExtra(
                                DailyWordNotifications.EXTRA_EDITORIAL_DATE_KEY,
                            ),
                        )

                    Intent.ACTION_BOOT_COMPLETED,
                    Intent.ACTION_MY_PACKAGE_REPLACED,
                    Intent.ACTION_TIME_CHANGED,
                    Intent.ACTION_TIMEZONE_CHANGED ->
                        manager.refresh()
                }
            } finally {
                pendingResult.finish()
            }
        }
    }
}
