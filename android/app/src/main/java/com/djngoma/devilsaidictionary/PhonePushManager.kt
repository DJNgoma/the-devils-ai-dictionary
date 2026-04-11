package com.djngoma.devilsaidictionary

import android.Manifest
import android.app.NotificationManager
import android.content.Context
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale
import java.util.TimeZone

enum class PushOptInStatus(val wireValue: String) {
    authorized("authorized"),
    denied("denied"),
    notDetermined("notDetermined"),
    unsupported("unsupported"),
    unknown("unknown"),
}

class PhonePushManager(
    private val context: Context,
    private val storage: SharedPreferences,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    @Volatile
    var optInStatus: PushOptInStatus = PushOptInStatus.notDetermined
        private set

    @Volatile
    var fcmToken: String? = null
        private set

    @Volatile
    var lastRegistrationError: String? = null
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
        val cachedToken = storage.getString(TOKEN_KEY, null)
        if (cachedToken != null) {
            fcmToken = cachedToken
        }

        if (notificationsPreferenceEnabled && (optInStatus == PushOptInStatus.authorized || cachedToken != null)) {
            fetchTokenAndRegister()
        } else if (!notificationsPreferenceEnabled && cachedToken != null) {
            registerWithBackend(cachedToken, PushOptInStatus.denied)
        }
    }

    fun handleNewFcmToken(token: String) {
        fcmToken = token
        storage.edit().putString(TOKEN_KEY, token).apply()
        registerWithBackend(token, backendStatus())
    }

    fun recordPermissionResult(granted: Boolean) {
        optInStatus = if (granted) PushOptInStatus.authorized else PushOptInStatus.denied
        if (granted && notificationsPreferenceEnabled) {
            fetchTokenAndRegister()
        } else {
            fcmToken?.let { token -> registerWithBackend(token, backendStatus()) }
        }
    }

    fun setNotificationsPreferenceEnabled(enabled: Boolean) {
        storage.edit().putBoolean(NOTIFICATIONS_PREFERENCE_KEY, enabled).apply()
        refresh()
    }

    fun setPreferredDeliveryHour(hour: Int) {
        storage.edit()
            .putInt(PREFERRED_DELIVERY_HOUR_KEY, hour.coerceIn(0, 23))
            .apply()
        refresh()
    }

    fun systemOptInStatus(): PushOptInStatus {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS,
            ) == PackageManager.PERMISSION_GRANTED
            if (granted) return PushOptInStatus.authorized
            return PushOptInStatus.notDetermined
        }

        val areEnabled = NotificationManagerCompat.from(context).areNotificationsEnabled()
        return if (areEnabled) PushOptInStatus.authorized else PushOptInStatus.denied
    }

    private fun fetchTokenAndRegister() {
        scope.launch {
            runCatching {
                FirebaseMessaging.getInstance().token.await()
            }.onSuccess { token ->
                if (!token.isNullOrEmpty()) {
                    fcmToken = token
                    storage.edit().putString(TOKEN_KEY, token).apply()
                    registerWithBackend(token, backendStatus())
                }
            }.onFailure { error ->
                lastRegistrationError = error.message ?: "Unable to fetch FCM token."
            }
        }
    }

    private fun registerWithBackend(token: String, status: PushOptInStatus) {
        scope.launch {
            runCatching {
                postInstallation(token, status)
            }.onSuccess {
                lastRegistrationError = null
            }.onFailure { error ->
                lastRegistrationError = error.message ?: "Installation upsert failed."
            }
        }
    }

    private fun postInstallation(token: String, status: PushOptInStatus) {
        val url = URL("$BASE_URL/api/mobile/push/installations")
        val locale = Locale.getDefault().toLanguageTag()
        val payload = JSONObject()
            .put("token", token)
            .put("platform", "android")
            .put("environment", if (BuildConfig.DEBUG) "development" else "production")
            .put("optInStatus", status.wireValue)
            .put(
                "appVersion",
                "${BuildConfig.APP_VERSION_NAME} (${BuildConfig.APP_VERSION_CODE})",
            )
            .put("locale", locale)
            .put("preferredDeliveryHour", preferredDeliveryHour)
            .put("timeZone", TimeZone.getDefault().id)
            .toString()

        val connection = url.openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "POST"
            connection.connectTimeout = 10_000
            connection.readTimeout = 10_000
            connection.doOutput = true
            connection.setRequestProperty("content-type", "application/json")
            connection.outputStream.use { stream ->
                stream.write(payload.toByteArray(Charsets.UTF_8))
            }
            val code = connection.responseCode
            if (code !in 200..299) {
                val body = connection.errorStream?.bufferedReader()?.use { it.readText() }
                throw IllegalStateException("Installations POST failed: $code ${body.orEmpty()}")
            }
        } finally {
            connection.disconnect()
        }
    }

    companion object {
        private const val TOKEN_KEY = "fcm-device-token"
        private const val NOTIFICATIONS_PREFERENCE_KEY = "notifications-preference-enabled"
        private const val PREFERRED_DELIVERY_HOUR_KEY = "preferred-delivery-hour"
        private const val DEFAULT_PREFERRED_DELIVERY_HOUR = 9
        private const val BASE_URL = "https://thedevilsaidictionary.com"
    }

    private fun storedNotificationsPreferenceEnabled(): Boolean? {
        if (!storage.contains(NOTIFICATIONS_PREFERENCE_KEY)) {
            return null
        }

        return storage.getBoolean(NOTIFICATIONS_PREFERENCE_KEY, false)
    }

    private fun inferredNotificationsPreferenceEnabled(status: PushOptInStatus): Boolean =
        status.canDeliver

    private fun backendStatus(): PushOptInStatus =
        if (notificationsPreferenceEnabled) optInStatus else PushOptInStatus.denied
}

private val PushOptInStatus.canDeliver: Boolean
    get() = this == PushOptInStatus.authorized
