package com.djngoma.devilsaidictionary

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.enableEdgeToEdge
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen

class DictionaryActivity : ComponentActivity() {
    private lateinit var store: NativeDictionaryStore

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        store.pushManager?.recordPermissionResult(granted)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val pushManager = (application as? DictionaryApplication)?.pushManager
        store = NativeDictionaryStore(
            context = this,
            pushManager = pushManager,
            requestPushPermission = { requestNotificationsPermission() },
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
    }

    private fun requestNotificationsPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            store.pushManager?.recordPermissionResult(true)
        }
    }
}
