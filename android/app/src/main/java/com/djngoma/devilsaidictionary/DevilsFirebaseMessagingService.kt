package com.djngoma.devilsaidictionary

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
        if (slug == null) {
            return
        }

        DailyWordNotifications.showEntryNotification(
            context = this,
            slug = slug,
            title = title,
            body = body,
            source = notificationSourceFrom(message.data["source"]),
            editorialDateKey = message.data[DailyWordNotifications.EXTRA_EDITORIAL_DATE_KEY],
        )
    }
}
