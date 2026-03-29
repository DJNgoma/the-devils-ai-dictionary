package com.djngoma.devilsaidictionary.nativeapp

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.enableEdgeToEdge
import androidx.activity.compose.setContent

class NativeDictionaryActivity : ComponentActivity() {
    private lateinit var store: NativeDictionaryStore

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        store = NativeDictionaryStore(this)
        store.handleIntent(intent)

        setContent {
            NativeDictionaryApp(store = store)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        store.handleIntent(intent)
    }
}
