package com.djngoma.devilsaidictionary

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.foundation.isSystemInDarkTheme
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

    var showSplash by remember { mutableStateOf(true) }
    val systemIsDark = isSystemInDarkTheme()
    val activeTheme = if (store.siteThemeMode == SiteThemeMode.auto) {
        if (systemIsDark) SiteTheme.night else SiteTheme.book
    } else {
        store.manualSiteTheme
    }

    LaunchedEffect(systemIsDark) {
        store.updateSystemDarkMode(systemIsDark)
    }

    NativeAppTheme(theme = activeTheme) { colors ->
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

            if (showSplash) {
                SplashScreen(
                    isDark = activeTheme.isDark,
                    onFinished = { showSplash = false },
                )
            }
        }
    }
}
