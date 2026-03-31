package com.djngoma.devilsaidictionary

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.MenuBook
import androidx.compose.material.icons.rounded.BookmarkBorder
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.MoreVert
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp

object NativeUiTags {
    const val BottomDock = "native-bottom-dock"
    const val TabHome = "native-tab-home"
    const val TabBrowse = "native-tab-browse"
    const val TabSearch = "native-tab-search"
    const val TabSaved = "native-tab-saved"
    const val OverflowButton = "native-overflow-button"
    const val SearchFiltersButton = "native-search-filters"
    const val SearchFilterSheet = "native-search-filter-sheet"
    const val HomeScreen = "native-screen-home"
    const val BrowseScreen = "native-screen-browse"
    const val SearchScreen = "native-screen-search"
    const val SavedScreen = "native-screen-saved"
}

private data class NativeDestination(
    val tab: NativeTab,
    val label: String,
    val icon: ImageVector,
    val tag: String,
)

private val nativeDestinations =
    listOf(
        NativeDestination(NativeTab.Home, "Home", Icons.Rounded.Home, NativeUiTags.TabHome),
        NativeDestination(NativeTab.Browse, "Browse", Icons.AutoMirrored.Rounded.MenuBook, NativeUiTags.TabBrowse),
        NativeDestination(NativeTab.Search, "Search", Icons.Rounded.Search, NativeUiTags.TabSearch),
        NativeDestination(NativeTab.Saved, "Saved", Icons.Rounded.BookmarkBorder, NativeUiTags.TabSaved),
    )

@Composable
fun NativeMainScaffold(
    store: NativeDictionaryStore,
    colors: NativeColors,
) {
    var menuOpen by remember { mutableStateOf(false) }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = colors.paper,
        contentWindowInsets = WindowInsets.safeDrawing.only(
            WindowInsetsSides.Top + WindowInsetsSides.Horizontal,
        ),
        topBar = {
            NativeTopBar(
                title = when (store.selectedTab) {
                    NativeTab.Home -> "Home"
                    NativeTab.Browse -> "Browse"
                    NativeTab.Search -> "Search"
                    NativeTab.Saved -> "Saved"
                },
                colors = colors,
                menuOpen = menuOpen,
                onMenuOpenChange = { menuOpen = it },
                store = store,
            )
        },
        bottomBar = {
            NativeBottomDock(
                selectedTab = store.selectedTab,
                colors = colors,
                onSelect = store::selectTab,
            )
        },
    ) { padding ->
        when (store.selectedTab) {
            NativeTab.Home -> NativeHomeScreen(store, colors, padding)
            NativeTab.Browse -> NativeBrowseScreen(store, colors, padding)
            NativeTab.Search -> NativeSearchScreen(store, colors, padding)
            NativeTab.Saved -> NativeSavedScreen(store, colors, padding)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NativeTopBar(
    title: String,
    colors: NativeColors,
    menuOpen: Boolean,
    onMenuOpenChange: (Boolean) -> Unit,
    store: NativeDictionaryStore,
) {
    Surface(
        color = colors.chrome,
        shadowElevation = 3.dp,
    ) {
        Column {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.Transparent,
                    titleContentColor = MaterialTheme.colorScheme.onSurface,
                    actionIconContentColor = colors.accent,
                ),
                title = {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.headlineMedium,
                    )
                },
                actions = {
                    IconButton(
                        onClick = { onMenuOpenChange(true) },
                        modifier = Modifier.testTag(NativeUiTags.OverflowButton),
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.MoreVert,
                            contentDescription = "More actions",
                        )
                    }
                    DropdownMenu(
                        expanded = menuOpen,
                        onDismissRequest = { onMenuOpenChange(false) },
                    ) {
                        DropdownMenuItem(
                            text = { Text("Read the book") },
                            onClick = {
                                onMenuOpenChange(false)
                                store.presentBook()
                            },
                        )
                        DropdownMenuItem(
                            text = { Text("How to read") },
                            onClick = {
                                onMenuOpenChange(false)
                                store.presentGuide()
                            },
                        )
                        DropdownMenuItem(
                            text = { Text("About") },
                            onClick = {
                                onMenuOpenChange(false)
                                store.presentAbout()
                            },
                        )
                        DropdownMenuItem(
                            text = { Text("Random entry") },
                            onClick = {
                                onMenuOpenChange(false)
                                store.openRandomEntry()
                            },
                        )
                        HorizontalDivider()
                        SiteTheme.entries.forEach { theme ->
                            DropdownMenuItem(
                                text = { Text(theme.label) },
                                leadingIcon = {
                                    if (theme == store.siteTheme) {
                                        Icon(
                                            imageVector = Icons.Rounded.Check,
                                            contentDescription = null,
                                        )
                                    }
                                },
                                onClick = {
                                    onMenuOpenChange(false)
                                    store.setTheme(theme)
                                },
                            )
                        }
                    }
                },
            )
            HorizontalDivider(color = colors.border.copy(alpha = 0.85f))
        }
    }
}

@Composable
private fun NativeBottomDock(
    selectedTab: NativeTab,
    colors: NativeColors,
    onSelect: (NativeTab) -> Unit,
) {
    Surface(
        color = colors.chrome,
        border = BorderStroke(1.dp, colors.border.copy(alpha = 0.9f)),
        shadowElevation = 6.dp,
    ) {
        NavigationBar(
            modifier = Modifier
                .navigationBarsPadding()
                .heightIn(min = NativeLayout.dockMinHeight)
                .testTag(NativeUiTags.BottomDock),
            containerColor = Color.Transparent,
            tonalElevation = 0.dp,
            windowInsets = WindowInsets(0, 0, 0, 0),
        ) {
            nativeDestinations.forEach { destination ->
                NavigationBarItem(
                    modifier = Modifier.testTag(destination.tag),
                    selected = selectedTab == destination.tab,
                    onClick = { onSelect(destination.tab) },
                    icon = {
                        Icon(
                            imageVector = destination.icon,
                            contentDescription = destination.label,
                        )
                    },
                    label = {
                        Text(destination.label)
                    },
                    alwaysShowLabel = true,
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = colors.accent,
                        selectedTextColor = colors.accent,
                        indicatorColor = colors.accentMuted,
                        unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                        unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    ),
                )
            }
        }
    }
}

@Composable
fun NativeOverlayScaffold(
    overlay: NativeOverlay,
    store: NativeDictionaryStore,
    colors: NativeColors,
) {
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = colors.paper,
        shadowElevation = 8.dp,
    ) {
        Scaffold(
            modifier = Modifier.fillMaxSize(),
            containerColor = Color.Transparent,
            contentWindowInsets = WindowInsets.safeDrawing.only(
                WindowInsetsSides.Top + WindowInsetsSides.Horizontal,
            ),
            topBar = {
                NativeOverlayTopBar(
                    overlay = overlay,
                    colors = colors,
                    onClose = store::dismissOverlay,
                )
            },
        ) { padding ->
            when (overlay) {
                NativeOverlay.Book -> BookOverlay(store, colors, padding)
                NativeOverlay.Guide -> GuideOverlay(colors, padding)
                NativeOverlay.About -> AboutOverlay(store, colors, padding)
                is NativeOverlay.EntryDetail -> {
                    val entry = store.entry(overlay.slug)
                    if (entry == null) {
                        MissingEntryOverlay(colors, padding)
                    } else {
                        EntryDetailOverlay(
                            entry = entry,
                            store = store,
                            colors = colors,
                            padding = padding,
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NativeOverlayTopBar(
    overlay: NativeOverlay,
    colors: NativeColors,
    onClose: () -> Unit,
) {
    val title =
        when (overlay) {
            NativeOverlay.Book -> "Book"
            NativeOverlay.Guide -> "Guide"
            NativeOverlay.About -> "About"
            is NativeOverlay.EntryDetail -> "Dictionary"
        }

    Surface(
        color = colors.chrome,
        shadowElevation = 3.dp,
    ) {
        Column {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.Transparent,
                    titleContentColor = MaterialTheme.colorScheme.onSurface,
                    navigationIconContentColor = colors.accent,
                ),
                navigationIcon = {
                    IconButton(onClick = onClose) {
                        Icon(
                            imageVector = Icons.Rounded.Close,
                            contentDescription = "Close",
                        )
                    }
                },
                title = {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleLarge,
                    )
                },
            )
            HorizontalDivider(color = colors.border.copy(alpha = 0.85f))
        }
    }
}
