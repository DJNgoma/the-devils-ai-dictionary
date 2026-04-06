package com.djngoma.devilsaidictionary

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build

class DictionaryApplication : Application() {
    lateinit var pushManager: PhonePushManager
        private set

    override fun onCreate() {
        super.onCreate()
        createDailyWordChannel()
        pushManager = PhonePushManager(
            context = this,
            storage = getSharedPreferences("native-dictionary-store", Context.MODE_PRIVATE),
        )
        if (BuildConfig.NATIVE_PUSH_CONFIGURED) {
            pushManager.refresh()
        }
    }

    private fun createDailyWordChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }

        val manager = getSystemService(NotificationManager::class.java) ?: return
        if (manager.getNotificationChannel(DAILY_WORD_CHANNEL_ID) != null) {
            return
        }

        val channel = NotificationChannel(
            DAILY_WORD_CHANNEL_ID,
            "Today's word",
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply {
            description = "A daily entry from The Devil's AI Dictionary."
            enableLights(false)
            enableVibration(true)
        }
        manager.createNotificationChannel(channel)
    }

    companion object {
        const val DAILY_WORD_CHANNEL_ID = "daily-word"
    }
}
