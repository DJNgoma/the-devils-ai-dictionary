package com.djngoma.devilsaidictionary

import android.app.PendingIntent
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class DevilsFirebaseMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        val app = application as? DictionaryApplication ?: return
        app.pushManager.handleNewFcmToken(token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val slug = message.data["slug"]
        val title = message.notification?.title
            ?: message.data["title"]
            ?: "Today's word"
        val body = message.notification?.body
            ?: message.data["body"]
            ?: "A fresh entry from The Devil's AI Dictionary."

        val intent = Intent(this, DictionaryActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            if (slug != null) {
                putExtra(EXTRA_NOTIFICATION_SLUG, slug)
            }
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            slug?.hashCode() ?: 0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(this, DictionaryApplication.DAILY_WORD_CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        NotificationManagerCompat.from(this)
            .notify(slug?.hashCode() ?: NOTIFICATION_ID, notification)
    }

    companion object {
        const val EXTRA_NOTIFICATION_SLUG = "notification_slug"
        private const val NOTIFICATION_ID = 2027
    }
}
