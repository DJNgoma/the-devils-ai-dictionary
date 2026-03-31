package com.djngoma.devilsaidictionary

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.enableEdgeToEdge
import androidx.activity.compose.setContent
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen

class DictionaryActivity : ComponentActivity() {
    private lateinit var store: NativeDictionaryStore

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        store = NativeDictionaryStore(this)
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
}
