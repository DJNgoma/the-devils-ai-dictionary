package com.djngoma.devilsaidictionary.nativeapp

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.BorderStroke
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MediumTopAppBar
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Typography
import java.util.Locale

private fun themeColors(theme: SiteTheme) = when (theme) {
    SiteTheme.book -> NativeColors(
        paper = Color(0xFFF4EFE6),
        panel = Color(0xFFFFFBF5),
        panelStrong = Color(0xFFEFE7DA),
        border = Color(0xFFD4C2B0),
        accent = Color(0xFFB2552F),
        accentMuted = Color(0xFFF7E0CF),
        warning = Color(0xFFA63B32),
        success = Color(0xFF26594A),
    )
    SiteTheme.codex -> NativeColors(
        paper = Color(0xFFF3F8FD),
        panel = Color(0xFFFFFFFF),
        panelStrong = Color(0xFFE9F1F9),
        border = Color(0xFFC4D5E8),
        accent = Color(0xFF0169CC),
        accentMuted = Color(0xFFD6E8F5),
        warning = Color(0xFFE02E2A),
        success = Color(0xFF00A240),
    )
    SiteTheme.absolutely -> NativeColors(
        paper = Color(0xFFF6F3EE),
        panel = Color(0xFFF9F9F7),
        panelStrong = Color(0xFFF0ECE4),
        border = Color(0xFFDDD0C3),
        accent = Color(0xFFCC7D5E),
        accentMuted = Color(0xFFF5E2D6),
        warning = Color(0xFFFF5F38),
        success = Color(0xFF00C853),
    )
    SiteTheme.night -> NativeColors(
        paper = Color(0xFF12100D),
        panel = Color(0xFF1C1814),
        panelStrong = Color(0xFF211C17),
        border = Color(0xFF4A3D38),
        accent = Color(0xFFE4864D),
        accentMuted = Color(0xFF663019),
        warning = Color(0xFFF08A7D),
        success = Color(0xFF5EC9A1),
    )
}

private val NativeTypography = Typography(
    headlineLarge = Typography().headlineLarge.copy(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.Bold,
        letterSpacing = (-0.5).sp,
    ),
    headlineMedium = Typography().headlineMedium.copy(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.SemiBold,
    ),
    titleLarge = Typography().titleLarge.copy(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.SemiBold,
    ),
    titleSmall = Typography().titleSmall.copy(
        fontFamily = FontFamily.Monospace,
        fontWeight = FontWeight.SemiBold,
        letterSpacing = 1.1.sp,
    ),
    bodyLarge = Typography().bodyLarge.copy(
        fontFamily = FontFamily.Serif,
    ),
    bodyMedium = Typography().bodyMedium.copy(
        fontFamily = FontFamily.Serif,
    ),
    labelLarge = Typography().labelLarge.copy(
        fontWeight = FontWeight.SemiBold,
    ),
)

private data class NativeColors(
    val paper: Color,
    val panel: Color,
    val panelStrong: Color,
    val border: Color,
    val accent: Color,
    val accentMuted: Color,
    val warning: Color,
    val success: Color,
)

@Composable
fun NativeDictionaryApp(store: NativeDictionaryStore) {
    val theme = store.siteTheme
    val nativeColors = remember(theme) { themeColors(theme) }

    val scheme = remember(theme, nativeColors) {
        val base = if (theme.isDark) darkColorScheme() else lightColorScheme()
        base.copy(
            primary = nativeColors.accent,
            surface = nativeColors.panel,
            surfaceVariant = nativeColors.panelStrong,
            background = nativeColors.paper,
            outline = nativeColors.border,
        )
    }

    MaterialTheme(
        colorScheme = scheme,
        typography = NativeTypography,
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(nativeColors.paper),
        ) {
            NativeMainScaffold(
                store = store,
                colors = nativeColors,
            )

            store.activeOverlay?.let { overlay ->
                BackHandler(onBack = store::dismissOverlay)
                NativeOverlayScreen(
                    overlay = overlay,
                    store = store,
                    colors = nativeColors,
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NativeMainScaffold(
    store: NativeDictionaryStore,
    colors: NativeColors,
) {
    var menuOpen by remember { mutableStateOf(false) }

    Scaffold(
        containerColor = colors.paper,
        topBar = {
            MediumTopAppBar(
                colors = TopAppBarDefaults.mediumTopAppBarColors(
                    containerColor = colors.paper,
                    titleContentColor = MaterialTheme.colorScheme.onBackground,
                ),
                title = {
                    Text(
                        text = when (store.selectedTab) {
                            NativeTab.Home -> "Home"
                            NativeTab.Browse -> "Browse"
                            NativeTab.Search -> "Search"
                            NativeTab.Saved -> "Saved"
                        },
                    )
                },
                actions = {
                    Box {
                        TextButton(onClick = { menuOpen = true }) {
                            Text("More")
                        }
                        DropdownMenu(
                            expanded = menuOpen,
                            onDismissRequest = { menuOpen = false },
                        ) {
                            DropdownMenuItem(
                                text = { Text("Read the book") },
                                onClick = {
                                    menuOpen = false
                                    store.presentBook()
                                },
                            )
                            DropdownMenuItem(
                                text = { Text("How to read") },
                                onClick = {
                                    menuOpen = false
                                    store.presentGuide()
                                },
                            )
                            DropdownMenuItem(
                                text = { Text("About") },
                                onClick = {
                                    menuOpen = false
                                    store.presentAbout()
                                },
                            )
                            DropdownMenuItem(
                                text = { Text("Random entry") },
                                onClick = {
                                    menuOpen = false
                                    store.openRandomEntry()
                                },
                            )
                            androidx.compose.material3.HorizontalDivider()
                            SiteTheme.entries.forEach { theme ->
                                DropdownMenuItem(
                                    text = {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        ) {
                                            Text(theme.label)
                                            if (theme == store.siteTheme) {
                                                Text(
                                                    "✓",
                                                    color = colors.accent,
                                                    fontWeight = FontWeight.Bold,
                                                )
                                            }
                                        }
                                    },
                                    onClick = {
                                        menuOpen = false
                                        store.setTheme(theme)
                                    },
                                )
                            }
                        }
                    }
                },
            )
        },
        bottomBar = {
            Surface(
                color = colors.panel,
                tonalElevation = 2.dp,
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    NativeNavItem(
                        label = "Home",
                        marker = "H",
                        selected = store.selectedTab == NativeTab.Home,
                        onClick = { store.selectTab(NativeTab.Home) },
                    )
                    NativeNavItem(
                        label = "Browse",
                        marker = "B",
                        selected = store.selectedTab == NativeTab.Browse,
                        onClick = { store.selectTab(NativeTab.Browse) },
                    )
                    NativeNavItem(
                        label = "Search",
                        marker = "S",
                        selected = store.selectedTab == NativeTab.Search,
                        onClick = { store.selectTab(NativeTab.Search) },
                    )
                    NativeNavItem(
                        label = "Saved",
                        marker = "V",
                        selected = store.selectedTab == NativeTab.Saved,
                        onClick = { store.selectTab(NativeTab.Saved) },
                    )
                }
            }
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

@Composable
private fun NativeNavItem(
    label: String,
    marker: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    TextButton(
        onClick = onClick,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = marker,
                color = if (selected) {
                    MaterialTheme.colorScheme.primary
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant
                },
            )
            Text(
                text = label,
                color = if (selected) {
                    MaterialTheme.colorScheme.primary
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant
                },
            )
        }
    }
}

@Composable
private fun NativeHomeScreen(
    store: NativeDictionaryStore,
    colors: NativeColors,
    padding: PaddingValues,
) {
    LazyColumn(
        contentPadding = PaddingValues(
            start = 16.dp,
            top = padding.calculateTopPadding() + 12.dp,
            end = 16.dp,
            bottom = padding.calculateBottomPadding() + 16.dp,
        ),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            NativeCard(colors = colors, emphasis = true) {
                SectionLabel(text = "Online book")
                Text(
                    text = "The Devil's AI Dictionary",
                    style = MaterialTheme.typography.headlineLarge,
                )
                Text(
                    text = "A sceptical field guide to the language machines, marketers, founders, and consultants use when they want to sound smarter than they are.",
                    style = MaterialTheme.typography.bodyLarge,
                )
                Text(
                    text = "This Android draft reads the bundled catalogue natively, keeps the saved place on-device, and lets the webview stop pretending it is the long-term plan.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Button(onClick = store::presentBook) {
                        Text("Read the book")
                    }
                    OutlinedButton(onClick = store::openRandomEntry) {
                        Text("Random entry")
                    }
                }
            }
        }

        store.currentWord?.let { currentWord ->
            item {
                NativeCard(colors = colors) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top,
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            SectionLabel(text = "Current word")
                            Text(
                                text = currentWord.title,
                                style = MaterialTheme.typography.headlineMedium,
                            )
                        }
                        Text(
                            text = formatDisplayDate(currentWord.updatedAt),
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Text(
                        text = currentWord.devilDefinition.trim(),
                        style = MaterialTheme.typography.bodyLarge,
                    )
                    Text(
                        text = currentWord.plainDefinition.trim(),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    currentWord.warningLabel?.let { warningLabel ->
                        WarningCard(text = warningLabel, colors = colors)
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Button(onClick = store::openCurrentWord) {
                            Text("Open word")
                        }
                        OutlinedButton(onClick = store::refreshCurrentWord) {
                            Text("Refresh")
                        }
                    }
                }
            }
        }

        store.loadError?.let { message ->
            item {
                WarningCard(
                    text = message,
                    colors = colors,
                )
            }
        }

        store.featuredEntry?.let { entry ->
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    SectionLabel(text = "Featured")
                    EntryCard(entry = entry, colors = colors) {
                        store.presentEntry(entry)
                    }
                }
            }
        }

        if (store.categoryStats.isNotEmpty()) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    SectionLabel(text = "Categories")
                    CategoryGrid(
                        categories = store.categoryStats,
                        colors = colors,
                        onClick = { category -> store.showBrowseCategory(category.slug) },
                    )
                }
            }
        }

        if (store.recentEntries.isNotEmpty()) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    SectionLabel(text = "Recently added")
                    store.recentEntries.forEach { entry ->
                        EntryCard(entry = entry, colors = colors, compact = true) {
                            store.presentEntry(entry)
                        }
                    }
                }
            }
        }

        if (store.misunderstoodEntries.isNotEmpty()) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    SectionLabel(text = "Most misunderstood")
                    store.misunderstoodEntries.forEach { entry ->
                        EntryCard(entry = entry, colors = colors, compact = true) {
                            store.presentEntry(entry)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun NativeBrowseScreen(
    store: NativeDictionaryStore,
    colors: NativeColors,
    padding: PaddingValues,
) {
    LazyColumn(
        contentPadding = PaddingValues(
            start = 16.dp,
            top = padding.calculateTopPadding() + 12.dp,
            end = 16.dp,
            bottom = padding.calculateBottomPadding() + 16.dp,
        ),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            NativeCard(colors = colors) {
                SectionLabel(text = "Browse")
                Text(
                    text = "Walk the catalogue by letter or narrow it to one category.",
                    style = MaterialTheme.typography.bodyLarge,
                )
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    item {
                        FilterChip(
                            selected = store.browseLetter == null,
                            onClick = { store.browseLetter = null },
                            label = { Text("All letters") },
                        )
                    }
                    items(store.letterOptions) { letter ->
                        FilterChip(
                            selected = store.browseLetter == letter,
                            onClick = { store.browseLetter = letter },
                            label = { Text(letter) },
                        )
                    }
                }

                SimpleDropdown(
                    label = "Category",
                    value = store.categoryTitle(store.browseCategorySlug) ?: "All categories",
                    options = listOf("All categories" to null) +
                        store.categoryStats.map { category -> category.title to category.slug },
                    onSelected = { store.browseCategorySlug = it },
                )

                if (store.browseCategorySlug != null || store.browseLetter != null) {
                    OutlinedButton(
                        onClick = {
                            store.browseLetter = null
                            store.browseCategorySlug = null
                        },
                    ) {
                        Text("Clear browse filters")
                    }
                }
            }
        }

        if (store.browseSections.isEmpty()) {
            item {
                EmptyStateCard(
                    title = "Nothing matched that combination.",
                    body = "Reset the browse filters and let the catalogue breathe again.",
                    colors = colors,
                    primaryLabel = "Show the full catalogue",
                    onPrimary = {
                        store.browseLetter = null
                        store.browseCategorySlug = null
                    },
                )
            }
        } else {
            store.browseSections.forEach { section ->
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        SectionLabel(text = section.title)
                        section.entries.forEach { entry ->
                            EntryCard(entry = entry, colors = colors, compact = true) {
                                store.presentEntry(entry)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun NativeSearchScreen(
    store: NativeDictionaryStore,
    colors: NativeColors,
    padding: PaddingValues,
) {
    var filtersOpen by remember { mutableStateOf(false) }

    LazyColumn(
        contentPadding = PaddingValues(
            start = 16.dp,
            top = padding.calculateTopPadding() + 12.dp,
            end = 16.dp,
            bottom = padding.calculateBottomPadding() + 16.dp,
        ),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            NativeCard(colors = colors) {
                SectionLabel(text = "Search")
                Text(
                    text = "Search is local and plain. No mystical reranking, no semantic sermon, just the terms and their actual words.",
                    style = MaterialTheme.typography.bodyLarge,
                )
                OutlinedTextField(
                    value = store.searchQuery,
                    onValueChange = { store.searchQuery = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Look up the phrase before it colonises the meeting") },
                    singleLine = true,
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "${store.searchResults.size} results",
                        color = colors.accent,
                        style = MaterialTheme.typography.labelLarge,
                    )
                    OutlinedButton(onClick = { filtersOpen = !filtersOpen }) {
                        Text(if (store.hasSearchFilters) "Filters on" else "Filters")
                    }
                }
            }
        }

        if (filtersOpen) {
            item {
                NativeCard(colors = colors) {
                    SectionLabel(text = "Search filters")
                    SimpleDropdown(
                        label = "Category",
                        value = store.categoryTitle(store.searchCategorySlug) ?: "All categories",
                        options = listOf("All categories" to null) +
                            store.categoryStats.map { category -> category.title to category.slug },
                        onSelected = { store.searchCategorySlug = it },
                    )
                    SimpleDropdown(
                        label = "Difficulty",
                        value = when (store.searchDifficulty) {
                            Difficulty.beginner -> "Beginner"
                            Difficulty.intermediate -> "Intermediate"
                            Difficulty.advanced -> "Advanced"
                            null -> "All difficulty levels"
                        },
                        options = listOf(
                            "All difficulty levels" to null,
                            "Beginner" to Difficulty.beginner,
                            "Intermediate" to Difficulty.intermediate,
                            "Advanced" to Difficulty.advanced,
                        ),
                        onSelected = { store.searchDifficulty = it },
                    )
                    SimpleDropdown(
                        label = "Technical depth",
                        value = when (store.searchTechnicalDepth) {
                            TechnicalDepth.low -> "Light"
                            TechnicalDepth.medium -> "Practical"
                            TechnicalDepth.high -> "Deep"
                            null -> "All depth levels"
                        },
                        options = listOf(
                            "All depth levels" to null,
                            "Light" to TechnicalDepth.low,
                            "Practical" to TechnicalDepth.medium,
                            "Deep" to TechnicalDepth.high,
                        ),
                        onSelected = { store.searchTechnicalDepth = it },
                    )
                    SimpleDropdown(
                        label = "Vendor language",
                        value = when (store.searchVendorFilter) {
                            VendorFilter.all -> "Show everything"
                            VendorFilter.vendorOnly -> "Vendor terms only"
                            VendorFilter.nonVendorOnly -> "Non-vendor only"
                        },
                        options = listOf(
                            "Show everything" to VendorFilter.all,
                            "Vendor terms only" to VendorFilter.vendorOnly,
                            "Non-vendor only" to VendorFilter.nonVendorOnly,
                        ),
                        onSelected = { store.searchVendorFilter = it ?: VendorFilter.all },
                    )
                    TextButton(onClick = {
                        store.searchQuery = ""
                        store.resetSearchFilters()
                    }) {
                        Text("Reset filters", color = colors.warning)
                    }
                }
            }
        }

        if (store.searchResults.isEmpty()) {
            item {
                EmptyStateCard(
                    title = "Nothing matched the current query.",
                    body = "Strip the jargon back, reset the filters, and try again.",
                    colors = colors,
                    primaryLabel = "Clear filters",
                    onPrimary = {
                        store.searchQuery = ""
                        store.resetSearchFilters()
                    },
                )
            }
        } else {
            store.searchResults.forEach { entry ->
                item {
                    EntryCard(entry = entry, colors = colors, compact = true) {
                        store.presentEntry(entry)
                    }
                }
            }
        }
    }
}

@Composable
private fun NativeSavedScreen(
    store: NativeDictionaryStore,
    colors: NativeColors,
    padding: PaddingValues,
) {
    LazyColumn(
        contentPadding = PaddingValues(
            start = 16.dp,
            top = padding.calculateTopPadding() + 12.dp,
            end = 16.dp,
            bottom = padding.calculateBottomPadding() + 16.dp,
        ),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            NativeCard(colors = colors) {
                SectionLabel(text = "Saved")
                Text(
                    text = "Saved places live on this device. Less cloud romance. Better continuity when you are moving between meetings.",
                    style = MaterialTheme.typography.bodyLarge,
                )
            }
        }

        val bookmark = store.savedPlace
        if (bookmark == null) {
            item {
                EmptyStateCard(
                    title = "Nothing saved yet.",
                    body = "Save a place while you read. One local bookmark is modest, but it is honest.",
                    colors = colors,
                    primaryLabel = "Browse entries",
                    onPrimary = { store.selectTab(NativeTab.Browse) },
                    secondaryLabel = "Search",
                    onSecondary = { store.selectTab(NativeTab.Search) },
                )
            }
        } else {
            item {
                NativeCard(colors = colors, emphasis = true) {
                    Text(
                        text = bookmark.title,
                        style = MaterialTheme.typography.headlineMedium,
                    )
                    Text(
                        text = bookmark.label,
                        color = colors.accent,
                        style = MaterialTheme.typography.labelLarge,
                    )
                    bookmark.description?.let { description ->
                        Text(
                            text = description,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Text(
                        text = "Saved ${formatDisplayDate(bookmark.savedAt)}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Button(onClick = store::openSavedPlace) {
                            Text("Open saved place")
                        }
                        OutlinedButton(onClick = store::clearSavedPlace) {
                            Text("Clear")
                        }
                    }
                }
            }

            store.savedEntry?.let { entry ->
                item {
                    EntryCard(entry = entry, colors = colors, compact = true) {
                        store.presentEntry(entry)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NativeOverlayScreen(
    overlay: NativeOverlay,
    store: NativeDictionaryStore,
    colors: NativeColors,
) {
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = colors.paper,
    ) {
        Scaffold(
            containerColor = colors.paper,
            topBar = {
                MediumTopAppBar(
                    colors = TopAppBarDefaults.mediumTopAppBarColors(
                        containerColor = colors.paper,
                    ),
                    title = {
                        Text(
                            text = when (overlay) {
                                NativeOverlay.About -> "About"
                                NativeOverlay.Book -> "Book"
                                NativeOverlay.Guide -> "Guide"
                                is NativeOverlay.EntryDetail -> store.entry(overlay.slug)?.title
                                    ?: "Missing entry"
                            },
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    },
                    navigationIcon = {
                        TextButton(onClick = store::dismissOverlay) {
                            Text("Close")
                        }
                    },
                )
            },
        ) { padding ->
            when (overlay) {
                NativeOverlay.About -> AboutOverlay(store, colors, padding)
                NativeOverlay.Book -> BookOverlay(store, colors, padding)
                NativeOverlay.Guide -> GuideOverlay(colors, padding)
                is NativeOverlay.EntryDetail -> {
                    val entry = store.entry(overlay.slug)
                    if (entry == null) {
                        MissingEntryOverlay(colors, padding)
                    } else {
                        EntryDetailOverlay(entry, store, colors, padding)
                    }
                }
            }
        }
    }
}

@Composable
private fun BookOverlay(
    store: NativeDictionaryStore,
    colors: NativeColors,
    padding: PaddingValues,
) {
    val startPoints = listOf(
        "ai-psychosis",
        "inference",
        "openai",
        "agentic-ai",
        "rag",
        "structured-outputs",
    ).mapNotNull(store::entry)

    LazyColumn(
        contentPadding = overlayPadding(padding),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            NativeCard(colors = colors, emphasis = true) {
                SectionLabel(text = "Book")
                Text(
                    text = "A field guide for people already in the room",
                    style = MaterialTheme.typography.headlineLarge,
                )
                Text(
                    text = "The dictionary has two jobs. First, to expose inflated language before it hardens into received wisdom. Second, to make the useful distinctions visible: model versus product, retrieval versus memory, structure versus theatre, evaluation versus vibes.",
                )
                Text(
                    text = "The entries are short on purpose. If a concept cannot survive plain English, it usually needs less reverence, not more slideware.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Button(onClick = store::saveBook) {
                        Text("Save this page")
                    }
                    OutlinedButton(onClick = {
                        store.dismissOverlay()
                        store.selectTab(NativeTab.Browse)
                    }) {
                        Text("Browse entries")
                    }
                }
            }
        }
        item {
            NativeCard(colors = colors) {
                SectionLabel(text = "How this book reads")
                Text("Devil's definition: the memorable line that punctures fog quickly.")
                Text("Straight definition: the technically serious part, useful when you need the room to stop improvising.")
                Text("What to ask next: the questions that turn slogans back into concrete claims.")
            }
        }
        if (startPoints.isNotEmpty()) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    SectionLabel(text = "Good places to start")
                    startPoints.forEach { entry ->
                        EntryCard(entry = entry, colors = colors, compact = true) {
                            store.presentEntry(entry)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun GuideOverlay(
    colors: NativeColors,
    padding: PaddingValues,
) {
    LazyColumn(
        contentPadding = overlayPadding(padding),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            NativeCard(colors = colors, emphasis = true) {
                SectionLabel(text = "Guide")
                Text(
                    text = "How to read this dictionary",
                    style = MaterialTheme.typography.headlineLarge,
                )
                Text(
                    text = "Think of each entry as a small trap for inflated language. It opens with the joke, then closes on the actual meaning.",
                )
            }
        }
        item {
            NativeCard(colors = colors) {
                SectionLabel(text = "The structure")
                Text("Devil's definition: the sharp line that captures the social function of the term.")
                Text("Straight definition: the clean technical or practical meaning.")
                Text("How people abuse the term: the ways it gets stretched, laundered, or used as camouflage.")
                Text("What to ask next: the questions that convert slogans back into claims you can test.")
            }
        }
        item {
            NativeCard(colors = colors) {
                SectionLabel(text = "The labels")
                Text("Difficulty tracks assumed familiarity, not status.")
                Text("Technical depth tells you how far into the mechanics the entry goes.")
                Text("Warning labels appear when a term is especially abused, especially vague, or mostly marketing.")
            }
        }
    }
}

@Composable
private fun AboutOverlay(
    store: NativeDictionaryStore,
    colors: NativeColors,
    padding: PaddingValues,
) {
    val uriHandler = LocalUriHandler.current
    val chatGPT = store.entry("chatgpt")
    val codex = store.entry("codex")

    LazyColumn(
        contentPadding = overlayPadding(padding),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            NativeCard(colors = colors, emphasis = true) {
                SectionLabel(text = "About")
                Text(
                    text = "About this book",
                    style = MaterialTheme.typography.headlineLarge,
                )
                Text(
                    text = "The project is for readers who already hear AI jargon daily and would like some of it translated back into English before it damages a strategy deck.",
                )
            }
        }
        item {
            NativeCard(colors = colors) {
                Text("The editorial voice is dry on purpose. AI language is often inflated long before it is clarified. A little wit helps puncture that inflation without collapsing into cynicism or boosterism.")
                Text(
                    text = "The book is not anti-technology, anti-start-up, or anti-ambition. It is against terminology doing more work than the systems themselves. If a phrase has a legitimate technical meaning, the entry treats it seriously. If it is mostly branding, the entry says so.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (chatGPT != null && codex != null) {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        SectionLabel(text = "Co-authors")
                        EntryCard(entry = chatGPT, colors = colors, compact = true) {
                            store.presentEntry(chatGPT)
                        }
                        EntryCard(entry = codex, colors = colors, compact = true) {
                            store.presentEntry(codex)
                        }
                    }
                }
                TextButton(onClick = {
                    uriHandler.openUri("https://github.com/DJNgoma/the-devils-ai-dictionary")
                }) {
                    Text("Open the public repository")
                }
            }
        }
    }
}

@Composable
private fun MissingEntryOverlay(
    colors: NativeColors,
    padding: PaddingValues,
) {
    LazyColumn(
        contentPadding = overlayPadding(padding),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            NativeCard(colors = colors) {
                Text(
                    text = "That entry is missing from the bundled catalogue.",
                    style = MaterialTheme.typography.headlineMedium,
                )
                Text(
                    text = "The app received a route for a term that is not in this local snapshot. Refresh the content index in the repo and rebuild the app if this keeps happening.",
                )
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun EntryDetailOverlay(
    entry: Entry,
    store: NativeDictionaryStore,
    colors: NativeColors,
    padding: PaddingValues,
) {
    LazyColumn(
        contentPadding = overlayPadding(padding),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            NativeCard(colors = colors, emphasis = true) {
                SectionLabel(text = "Dictionary")
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    NativeChip(label = entry.letter, colors = colors, tone = ChipTone.Accent)
                    NativeChip(label = difficultyLabel(entry.difficulty), colors = colors)
                    NativeChip(label = technicalDepthLabel(entry.technicalDepth), colors = colors)
                    if (entry.isVendorTerm) {
                        NativeChip(label = "Vendor term", colors = colors, tone = ChipTone.Success)
                    }
                    entry.categories.forEach { category ->
                        NativeChip(label = category, colors = colors)
                    }
                }
                Text(
                    text = entry.title,
                    style = MaterialTheme.typography.headlineLarge,
                )
                Text(
                    text = entry.devilDefinition.trim(),
                    style = MaterialTheme.typography.bodyLarge,
                )
                Text(
                    text = entry.plainDefinition.trim(),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    text = "Published ${formatDisplayDate(entry.publishedAt)}   Updated ${formatDisplayDate(entry.updatedAt)}",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (entry.aliases.isNotEmpty()) {
                    Text(
                        text = "Also known as ${entry.aliases.joinToString()}",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Button(onClick = { store.save(entry) }) {
                        Text("Save place")
                    }
                    OutlinedButton(onClick = {
                        store.relatedEntriesFor(entry).firstOrNull()?.let(store::presentEntry)
                    }) {
                        Text("Related terms")
                    }
                }
                entry.warningLabel?.let { warningLabel ->
                    WarningCard(text = warningLabel, colors = colors)
                }
            }
        }

        if (entry.translations.isNotEmpty()) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    SectionLabel(text = "Translations")
                    entry.translations.forEach { translation ->
                        NativeCard(colors = colors) {
                            SectionLabel(text = translation.label)
                            Text(translation.text)
                        }
                    }
                }
            }
        }

        item {
            EntrySectionCard(title = "Straight definition", bodyText = entry.plainDefinition, colors = colors)
        }
        item {
            EntrySectionCard(title = "Why this term exists", bodyText = entry.whyExists, colors = colors)
        }
        item {
            EntrySectionCard(title = "How people abuse the term", bodyText = entry.misuse, colors = colors)
        }
        item {
            EntrySectionCard(title = "What it usually means in practice", bodyText = entry.practicalMeaning, colors = colors)
        }
        item {
            EntrySectionCard(title = "Practical example", bodyText = entry.example, colors = colors)
        }

        if (entry.askNext.isNotEmpty()) {
            item {
                NativeCard(colors = colors) {
                    SectionLabel(text = "What to ask next")
                    entry.askNext.forEach { question ->
                        Text("- $question")
                    }
                }
            }
        }

        if (entry.seeAlso.isNotEmpty()) {
            item {
                NativeCard(colors = colors) {
                    SectionLabel(text = "See also")
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        entry.seeAlso.forEach { label ->
                            val related = store.entry(label)
                            FilterChip(
                                selected = false,
                                onClick = {
                                    if (related != null) {
                                        store.presentEntry(related)
                                    }
                                },
                                label = { Text(label) },
                            )
                        }
                    }
                }
            }
        }

        entry.note?.takeIf { it.isNotBlank() }?.let { note ->
            item {
                EntrySectionCard(title = "Context note", bodyText = note, colors = colors)
            }
        }

        if (entry.vendorReferences.isNotEmpty()) {
            item {
                NativeCard(colors = colors) {
                    SectionLabel(text = "Vendor references")
                    entry.vendorReferences.forEach { reference ->
                        Text(reference)
                    }
                }
            }
        }

        entry.body.trim().takeIf(String::isNotEmpty)?.let { body ->
            item {
                NativeCard(colors = colors) {
                    SectionLabel(text = "Editorial aside")
                    Text(body)
                }
            }
        }

        val relatedEntries = store.relatedEntriesFor(entry)
        if (relatedEntries.isNotEmpty()) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    SectionLabel(text = "Related terms")
                    relatedEntries.forEach { related ->
                        EntryCard(entry = related, colors = colors, compact = true) {
                            store.presentEntry(related)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun EntrySectionCard(
    title: String,
    bodyText: String,
    colors: NativeColors,
) {
    NativeCard(colors = colors) {
        SectionLabel(text = title)
        Text(bodyText.trim())
    }
}

@Composable
private fun NativeCard(
    colors: NativeColors,
    emphasis: Boolean = false,
    content: @Composable ColumnScope.() -> Unit,
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = if (emphasis) colors.panelStrong else colors.panel,
        ),
        modifier = Modifier.fillMaxWidth(),
        border = BorderStroke(1.dp, colors.border),
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            content = content,
        )
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text = text.uppercase(Locale.getDefault()),
        style = MaterialTheme.typography.titleSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}

private enum class ChipTone {
    Neutral,
    Accent,
    Success,
}

@Composable
private fun NativeChip(
    label: String,
    colors: NativeColors,
    tone: ChipTone = ChipTone.Neutral,
) {
    val background = when (tone) {
        ChipTone.Neutral -> colors.panelStrong
        ChipTone.Accent -> colors.accentMuted
        ChipTone.Success -> colors.success.copy(alpha = 0.18f)
    }
    val foreground = when (tone) {
        ChipTone.Neutral -> MaterialTheme.colorScheme.onSurface
        ChipTone.Accent -> colors.accent
        ChipTone.Success -> colors.success
    }

    Surface(
        color = background,
        shape = MaterialTheme.shapes.extraLarge,
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            color = foreground,
            style = MaterialTheme.typography.labelLarge,
        )
    }
}

@Composable
private fun EntryCard(
    entry: Entry,
    colors: NativeColors,
    compact: Boolean = false,
    onClick: () -> Unit,
) {
    NativeCard(colors = colors) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onClick),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                NativeChip(label = entry.letter, colors = colors, tone = ChipTone.Accent)
                if (entry.warningLabel != null) {
                    NativeChip(label = "Warning", colors = colors)
                }
            }
            Text(
                text = entry.title,
                style = if (compact) MaterialTheme.typography.titleLarge else MaterialTheme.typography.headlineMedium,
            )
            Text(
                text = entry.devilDefinition.trim(),
                maxLines = if (compact) 3 else 6,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = entry.plainDefinition.trim(),
                maxLines = if (compact) 3 else 5,
                overflow = TextOverflow.Ellipsis,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun WarningCard(
    text: String,
    colors: NativeColors,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = colors.warning.copy(alpha = 0.14f),
        shape = MaterialTheme.shapes.large,
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(14.dp),
            color = colors.warning,
        )
    }
}

@Composable
private fun EmptyStateCard(
    title: String,
    body: String,
    colors: NativeColors,
    primaryLabel: String,
    onPrimary: () -> Unit,
    secondaryLabel: String? = null,
    onSecondary: (() -> Unit)? = null,
) {
    NativeCard(colors = colors) {
        Text(
            text = title,
            style = MaterialTheme.typography.headlineMedium,
        )
        Text(
            text = body,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Button(onClick = onPrimary) {
                Text(primaryLabel)
            }
            if (secondaryLabel != null && onSecondary != null) {
                OutlinedButton(onClick = onSecondary) {
                    Text(secondaryLabel)
                }
            }
        }
    }
}

@Composable
private fun CategoryGrid(
    categories: List<CategoryStat>,
    colors: NativeColors,
    onClick: (CategoryStat) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        categories.forEach { category ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onClick(category) },
                colors = CardDefaults.cardColors(containerColor = colors.panel),
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Text(
                        text = category.title,
                        style = MaterialTheme.typography.titleLarge,
                    )
                    Text(
                        text = category.description,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        text = "${category.count} terms",
                        color = colors.accent,
                        style = MaterialTheme.typography.labelLarge,
                    )
                }
            }
        }
    }
}

@Composable
private fun <T> SimpleDropdown(
    label: String,
    value: String,
    options: List<Pair<String, T?>>,
    onSelected: (T?) -> Unit,
) {
    var expanded by remember(label, value) { mutableStateOf(false) }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Box {
            OutlinedButton(
                onClick = { expanded = true },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    text = value,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            DropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false },
            ) {
                options.forEach { (optionLabel, optionValue) ->
                    DropdownMenuItem(
                        text = { Text(optionLabel) },
                        onClick = {
                            expanded = false
                            onSelected(optionValue)
                        },
                    )
                }
            }
        }
    }
}

private fun overlayPadding(padding: PaddingValues): PaddingValues =
    PaddingValues(
        start = 16.dp,
        top = padding.calculateTopPadding() + 12.dp,
        end = 16.dp,
        bottom = padding.calculateBottomPadding() + 16.dp,
    )

private fun difficultyLabel(value: Difficulty): String =
    when (value) {
        Difficulty.beginner -> "Beginner"
        Difficulty.intermediate -> "Intermediate"
        Difficulty.advanced -> "Advanced"
    }

private fun technicalDepthLabel(value: TechnicalDepth): String =
    when (value) {
        TechnicalDepth.low -> "Light"
        TechnicalDepth.medium -> "Practical"
        TechnicalDepth.high -> "Deep"
    }
