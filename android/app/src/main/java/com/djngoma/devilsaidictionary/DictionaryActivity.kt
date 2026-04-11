package com.djngoma.devilsaidictionary

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.enableEdgeToEdge
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.google.android.play.core.review.ReviewManagerFactory

class DictionaryActivity : ComponentActivity() {
    private lateinit var store: NativeDictionaryStore

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        store.pushManager?.recordPermissionResult(granted)
        store.refreshPushState()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val pushManager = (application as? DictionaryApplication)?.pushManager
        store = NativeDictionaryStore(
            context = this,
            pushManager = pushManager,
            openPushSettings = { openNotificationSettings() },
            requestPushPermission = { requestNotificationsPermission() },
            launchInAppReview = { launchInAppReview() },
            openAppReviewListing = { openAppReviewListing() },
        )
        store.handleIntent(intent)

        setContent {
            NativeDictionaryApp(
                store = store,
                onMoveTaskToBack = { moveTaskToBack(true) },
            )
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        store.handleIntent(intent)
    }

    override fun onResume() {
        super.onResume()
        store.onResume()
        store.pushManager?.refresh()
        store.refreshPushState()
    }

    private fun requestNotificationsPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else if (store.pushManager?.systemOptInStatus() == PushOptInStatus.denied) {
            openNotificationSettings()
        } else {
            store.pushManager?.recordPermissionResult(true)
            store.refreshPushState()
        }
    }

    private fun openNotificationSettings() {
        val notificationIntent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
            putExtra(Settings.EXTRA_APP_PACKAGE, packageName)
            putExtra("android.provider.extra.APP_PACKAGE", packageName)
        }

        runCatching { startActivity(notificationIntent) }
            .onFailure {
                startActivity(
                    Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                        data = Uri.fromParts("package", packageName, null)
                    },
                )
            }
    }

    private fun launchInAppReview() {
        val reviewManager = ReviewManagerFactory.create(this)
        reviewManager.requestReviewFlow()
            .addOnSuccessListener { reviewInfo ->
                reviewManager.launchReviewFlow(this, reviewInfo)
            }
    }

    private fun openAppReviewListing() {
        val playStoreIntent = Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$packageName"))
        val webIntent = Intent(
            Intent.ACTION_VIEW,
            Uri.parse("https://play.google.com/store/apps/details?id=$packageName"),
        )

        runCatching { startActivity(playStoreIntent) }
            .onFailure { startActivity(webIntent) }
    }
}
