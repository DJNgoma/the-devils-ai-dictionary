package com.djngoma.devilsaidictionary

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable
fun NativeDictionaryApp(store: NativeDictionaryStore) {
    NativeDictionaryApp(
        store = store,
        onMoveTaskToBack = {},
    )
}

@Composable
fun NativeDictionaryApp(
    store: NativeDictionaryStore,
    onMoveTaskToBack: () -> Unit,
) {
    BackHandler {
        if (!store.handleBack()) {
            onMoveTaskToBack()
        }
    }

    NativeAppTheme(theme = store.siteTheme) { colors ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(colors.paper),
        ) {
            NativeMainScaffold(
                store = store,
                colors = colors,
            )

            val overlay = store.activeOverlay
            if (overlay != null) {
                NativeOverlayScaffold(
                    overlay = overlay,
                    store = store,
                    colors = colors,
                )
            }
        }
    }
}
