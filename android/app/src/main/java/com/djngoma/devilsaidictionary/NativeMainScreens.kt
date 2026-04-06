package com.djngoma.devilsaidictionary

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.MenuBook
import androidx.compose.material.icons.rounded.AutoStories
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.FilterList
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material.icons.rounded.Shuffle
import androidx.compose.material.icons.rounded.Visibility
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp

@Composable
fun NativeHomeScreen(
    store: NativeDictionaryStore,
    colors: NativeColors,
    padding: PaddingValues,
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .testTag(NativeUiTags.HomeScreen),
        contentPadding = mainScreenPadding(padding),
        verticalArrangement = Arrangement.spacedBy(NativeLayout.sectionGap),
    ) {
        item {
            NativeScreenCard(colors = colors, emphasis = true) {
                SectionLabel(text = "Field guide")
                store.latestPublishedAt?.let { latestPublishedAt ->
                    Text(
                        text = "Updated ${formatDisplayDate(latestPublishedAt)}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text(
                    text = "The Devil's AI Dictionary",
                    style = MaterialTheme.typography.headlineLarge,
                )
                Text(
                    text = "A sceptical field guide to the language machines, marketers, founders, and consultants use when they want to sound smarter than they are.",
                    style = MaterialTheme.typography.bodyLarge,
                )
                if (store.developerMode) {
                    Text(
                        text = "This Android edition reads the bundled catalogue natively, remembers your place on-device, and uses Android chrome instead of a WebView in a fake moustache.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    NativePrimaryButton(
                        label = "Read the book",
                        colors = colors,
                        onClick = store::presentBook,
                        leadingIcon = Icons.Rounded.AutoStories,
                        modifier = Modifier.weight(1f),
                    )
                    NativeSecondaryButton(
                        label = "Random entry",
                        colors = colors,
                        onClick = store::openRandomEntry,
                        leadingIcon = Icons.Rounded.Shuffle,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }

        store.currentWord?.let { currentWord ->
            item {
                NativeScreenCard(colors = colors) {
                    SectionLabel(text = "Today's word")
                    Text(
                        text = currentWord.title,
                        style = MaterialTheme.typography.headlineMedium,
                    )
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
                    NativeActionRow {
                        NativePrimaryButton(
                            label = "Open current word",
                            colors = colors,
                            onClick = store::openCurrentWord,
                            leadingIcon = Icons.Rounded.Visibility,
                        )
                        NativeSecondaryButton(
                            label = "Share",
                            colors = colors,
                            onClick = store::shareCurrentWord,
                            leadingIcon = Icons.Rounded.Share,
                        )
                    }
                    if (BuildConfig.NATIVE_PUSH_CONFIGURED &&
                        store.pushOptInStatus != PushOptInStatus.authorized) {
                        HomePushPromptCard(
                            store = store,
                            colors = colors,
                        )
                    }
                }
            }
        }

        store.loadError?.let { message ->
            item { WarningCard(text = message, colors = colors) }
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
                    SectionLabel(text = "Browse by category")
                    CategoryGrid(
                        categories = store.categoryStats,
                        colors = colors,
                        onClick = { category -> store.presentCategory(category.slug) },
                    )
                }
            }
        }

        if (store.recentEntries.isNotEmpty()) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    SectionLabel(text = "Recently added")
                    store.latestPublishedAt?.let { latestPublishedAt ->
                        Text(
                            text = "Last words added ${formatDisplayDate(latestPublishedAt)}",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
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
fun NativeSearchScreen(
    store: NativeDictionaryStore,
    colors: NativeColors,
    padding: PaddingValues,
) {
    var filtersOpen by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .imePadding()
            .testTag(NativeUiTags.SearchScreen),
        contentPadding = mainScreenPadding(padding),
        verticalArrangement = Arrangement.spacedBy(NativeLayout.sectionGap),
    ) {
        item {
            NativeScreenCard(colors = colors, emphasis = true) {
                SectionLabel(text = "Search")
                Text(
                    text = "Search the bundled catalogue directly, then tighten the results with Android-style filters in a bottom sheet.",
                    style = MaterialTheme.typography.bodyLarge,
                )
                OutlinedTextField(
                    value = store.searchQuery,
                    onValueChange = { store.searchQuery = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Search the dictionary") },
                    placeholder = { Text("agent, structured outputs, retrieval") },
                    singleLine = true,
                )
                NativeActionRow {
                    NativeSecondaryButton(
                        label = if (store.hasSearchFilters) "Edit filters" else "Filters",
                        colors = colors,
                        onClick = { filtersOpen = true },
                        modifier = Modifier.testTag(NativeUiTags.SearchFiltersButton),
                        leadingIcon = Icons.Rounded.FilterList,
                    )
                    if (store.searchQuery.isNotBlank() || store.hasSearchFilters) {
                        NativeSecondaryButton(
                            label = "Clear search",
                            colors = colors,
                            onClick = {
                                store.searchQuery = ""
                                store.resetSearchFilters()
                            },
                        )
                    }
                }
                if (store.hasSearchFilters) {
                    NativeActionRow {
                        store.searchCategorySlug?.let { slug ->
                            NativeChip(
                                label = store.categoryTitle(slug) ?: slug,
                                colors = colors,
                                selected = true,
                            )
                        }
                        store.searchDifficulty?.let { difficulty ->
                            NativeChip(
                                label = difficultyLabel(difficulty),
                                colors = colors,
                                selected = true,
                            )
                        }
                        store.searchTechnicalDepth?.let { depth ->
                            NativeChip(
                                label = technicalDepthLabel(depth),
                                colors = colors,
                                selected = true,
                            )
                        }
                        if (store.searchVendorFilter != VendorFilter.all) {
                            NativeChip(
                                label = vendorFilterLabel(store.searchVendorFilter),
                                colors = colors,
                                selected = true,
                            )
                        }
                    }
                }
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(horizontal = 0.dp),
                ) {
                    item {
                        NativeChip(
                            label = "All",
                            colors = colors,
                            selected = store.searchLetter == null,
                            onClick = { store.searchLetter = null },
                        )
                    }
                    items("ABCDEFGHIJKLMNOPQRSTUVWXYZ".toList()) { letter ->
                        NativeChip(
                            label = letter.toString(),
                            colors = colors,
                            selected = store.searchLetter == letter.toString(),
                            onClick = { store.searchLetter = letter.toString() },
                        )
                    }
                }
            }
        }

        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                SectionLabel(text = "Results")
                Text(
                    text = "${store.searchResults.size} entries",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        if (store.searchResults.isEmpty()) {
            item {
                NativeEmptyState(
                    title = "No entries match that search",
                    body = "Try a broader query or loosen one of the filters in the sheet.",
                    colors = colors,
                    primaryLabel = "Open filters",
                    onPrimary = { filtersOpen = true },
                    secondaryLabel = "Clear search",
                    onSecondary = {
                        store.searchQuery = ""
                        store.resetSearchFilters()
                    },
                )
            }
        } else {
            items(store.searchResults, key = Entry::slug) { entry ->
                EntryCard(entry = entry, colors = colors, compact = true) {
                    store.presentEntry(entry)
                }
            }
        }
    }

    if (filtersOpen) {
        NativeFilterSheet(
            title = "Search filters",
            colors = colors,
            onDismiss = { filtersOpen = false },
        ) {
            SimpleDropdown(
                label = "Category",
                value = store.categoryTitle(store.searchCategorySlug) ?: "All categories",
                options = listOf("All categories" to null) + store.categoryStats.map { it.title to it.slug },
                onSelected = { selected -> store.searchCategorySlug = selected },
            )
            SimpleDropdown(
                label = "Difficulty",
                value = store.searchDifficulty?.let(::difficultyLabel) ?: "Any difficulty",
                options = listOf("Any difficulty" to null) + Difficulty.entries.map { difficulty ->
                    difficultyLabel(difficulty) to difficulty
                },
                onSelected = { selected -> store.searchDifficulty = selected },
            )
            SimpleDropdown(
                label = "Technical depth",
                value = store.searchTechnicalDepth?.let(::technicalDepthLabel) ?: "Any depth",
                options = listOf("Any depth" to null) + TechnicalDepth.entries.map { depth ->
                    technicalDepthLabel(depth) to depth
                },
                onSelected = { selected -> store.searchTechnicalDepth = selected },
            )
            SimpleDropdown(
                label = "Vendor terms",
                value = vendorFilterLabel(store.searchVendorFilter),
                options = VendorFilter.entries.map { filter ->
                    vendorFilterLabel(filter) to filter
                },
                onSelected = { selected ->
                    store.searchVendorFilter = selected ?: VendorFilter.all
                },
            )
            NativeActionRow {
                NativeSecondaryButton(
                    label = "Reset filters",
                    colors = colors,
                    onClick = store::resetSearchFilters,
                )
                NativePrimaryButton(
                    label = "Done",
                    colors = colors,
                    onClick = { filtersOpen = false },
                )
            }
        }
    }
}

@Composable
fun NativeSavedScreen(
    store: NativeDictionaryStore,
    colors: NativeColors,
    padding: PaddingValues,
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .testTag(NativeUiTags.SavedScreen),
        contentPadding = mainScreenPadding(padding),
        verticalArrangement = Arrangement.spacedBy(NativeLayout.sectionGap),
    ) {
        item {
            NativeScreenCard(colors = colors, emphasis = true) {
                SectionLabel(text = "Saved")
                Text(
                    text = "This screen keeps the reader's place on-device, with no account and no server remembering on its behalf.",
                    style = MaterialTheme.typography.bodyLarge,
                )
            }
        }

        val savedPlace = store.savedPlace
        if (savedPlace == null) {
            item {
                NativeEmptyState(
                    title = "No saved place yet",
                    body = "Save the book landing page or any entry detail to keep your place for the next launch.",
                    colors = colors,
                    primaryLabel = "Search entries",
                    onPrimary = { store.selectTab(NativeTab.Search) },
                    secondaryLabel = "Read the book",
                    onSecondary = store::presentBook,
                )
            }
        } else {
            item {
                NativeScreenCard(colors = colors, emphasis = true) {
                    SectionLabel(text = savedPlace.label)
                    Text(
                        text = savedPlace.title,
                        style = MaterialTheme.typography.headlineMedium,
                    )
                    savedPlace.description?.takeIf(String::isNotBlank)?.let { description ->
                        Text(
                            text = description,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    NativeChip(
                        label = "Saved ${formatDisplayDate(savedPlace.savedAt)}",
                        colors = colors,
                    )
                    NativeActionRow {
                        NativePrimaryButton(
                            label = "Open saved place",
                            colors = colors,
                            onClick = store::openSavedPlace,
                            leadingIcon = Icons.Rounded.Visibility,
                        )
                        NativeSecondaryButton(
                            label = "Clear",
                            colors = colors,
                            onClick = store::clearSavedPlace,
                        )
                    }
                }
            }

            store.savedEntry?.let { entry ->
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        SectionLabel(text = "Saved entry")
                        EntryCard(entry = entry, colors = colors, compact = true) {
                            store.presentEntry(entry)
                        }
                    }
                }
            }
        }

        store.currentWord?.let { currentWord ->
            item {
                NativeScreenCard(colors = colors) {
                    SectionLabel(text = "Today's word")
                    Text(
                        text = currentWord.title,
                        style = MaterialTheme.typography.titleLarge,
                    )
                    Text(
                        text = currentWord.devilDefinition.trim(),
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    NativeActionRow {
                        NativeSecondaryButton(
                            label = "Open current word",
                            colors = colors,
                            onClick = store::openCurrentWord,
                            leadingIcon = Icons.AutoMirrored.Rounded.MenuBook,
                        )
                        NativeSecondaryButton(
                            label = "Share",
                            colors = colors,
                            onClick = store::shareCurrentWord,
                            leadingIcon = Icons.Rounded.Share,
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun NativeSettingsScreen(
    store: NativeDictionaryStore,
    colors: NativeColors,
    padding: PaddingValues,
) {
    val uriHandler = LocalUriHandler.current

    LaunchedEffect(Unit) {
        store.checkLiveCatalogIfNeeded()
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .imePadding()
            .testTag(NativeUiTags.SettingsScreen),
        contentPadding = mainScreenPadding(padding),
        verticalArrangement = Arrangement.spacedBy(NativeLayout.sectionGap),
    ) {
        item {
            NativeScreenCard(colors = colors, emphasis = true) {
                SectionLabel(text = "Appearance")
                SiteTheme.entries.forEach { theme ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { store.setTheme(theme) }
                            .padding(vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        val themeColors = remember(theme) { themeSwatches(theme) }
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            themeColors.forEach { color ->
                                Box(
                                    modifier = Modifier
                                        .size(14.dp)
                                        .background(color, CircleShape),
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = theme.label,
                            style = MaterialTheme.typography.bodyLarge,
                            modifier = Modifier.weight(1f),
                        )
                        if (theme == store.siteTheme) {
                            Icon(
                                imageVector = Icons.Rounded.Check,
                                contentDescription = null,
                                tint = colors.accent,
                            )
                        }
                    }
                }
            }
        }

        item {
            NativeScreenCard(colors = colors) {
                SectionLabel(text = "Developer")
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "Developer mode",
                        style = MaterialTheme.typography.bodyLarge,
                        modifier = Modifier.weight(1f),
                    )
                    Switch(
                        checked = store.developerMode,
                        onCheckedChange = { store.toggleDeveloperMode(it) },
                    )
                }
            }
        }

        if (store.developerMode) {
        item {
            NativeScreenCard(colors = colors, emphasis = true) {
                SectionLabel(text = "Internal testing")
                Text(
                    text = "Use this page to compare the on-device catalogue with production, force a sync when editorial publishes a new word, and probe the same slug path that deep links rely on.",
                    style = MaterialTheme.typography.bodyLarge,
                )
                NativeActionRow {
                    NativeChip(
                        label = "Android ${store.appVersionLabel}",
                        colors = colors,
                        selected = true,
                    )
                    when {
                        store.isRefreshingCatalog -> {
                            NativeChip(label = "Syncing now", colors = colors, selected = true)
                        }

                        store.isCheckingLiveCatalog -> {
                            NativeChip(label = "Checking live site", colors = colors, selected = true)
                        }

                        store.liveCatalogMatchesDevice == true -> {
                            NativeChip(label = "Live site matches", colors = colors, accent = true)
                        }

                        store.liveCatalogMatchesDevice == false -> {
                            NativeChip(label = "Live site differs", colors = colors)
                        }
                    }
                }
            }
        }

        item {
            NativeScreenCard(colors = colors) {
                SectionLabel(text = "Live catalogue")
                Text(
                    text = store.liveCatalogStatusMessage,
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (store.liveCatalogError == null) {
                        MaterialTheme.colorScheme.onSurface
                    } else {
                        colors.warning
                    },
                )
                NativeSettingsValueRow(label = "Website", value = store.siteBaseUrlString)
                NativeSettingsValueRow(label = "Manifest", value = store.catalogManifestUrlString)
                store.bundledCatalogVersion?.let { bundledCatalogVersion ->
                    NativeSettingsValueRow(
                        label = "Bundled version",
                        value = bundledCatalogVersion,
                    )
                }
                NativeSettingsValueRow(
                    label = "On-device version",
                    value = store.catalogVersion ?: "Unavailable",
                )
                NativeSettingsValueRow(
                    label = "On-device entries",
                    value = store.deviceEntryCount.toString(),
                )
                store.latestPublishedAt?.let { latestPublishedAt ->
                    NativeSettingsValueRow(
                        label = "On-device latest word",
                        value = formatDisplayDate(latestPublishedAt),
                    )
                }
                store.lastCatalogCheckAtMs?.let { checkedAt ->
                    NativeSettingsValueRow(
                        label = "Last OTA check",
                        value = formatDisplayDateTime(checkedAt),
                    )
                }
                store.liveCatalogManifest?.let { manifest ->
                    NativeSettingsValueRow(label = "Live version", value = manifest.catalogVersion)
                    NativeSettingsValueRow(
                        label = "Live entries",
                        value = manifest.entryCount.toString(),
                    )
                    NativeSettingsValueRow(
                        label = "Live latest word",
                        value = formatDisplayDate(manifest.latestPublishedAt),
                    )
                    manifest.publishedAt?.let { publishedAt ->
                        NativeSettingsValueRow(
                            label = "Live manifest published",
                            value = formatDisplayDate(publishedAt),
                        )
                    }
                }
                store.liveCatalogCheckedAtMs?.let { checkedAt ->
                    NativeSettingsValueRow(
                        label = "Checked production",
                        value = formatDisplayDateTime(checkedAt),
                    )
                }
                NativeActionRow {
                    NativePrimaryButton(
                        label = "Check live site",
                        colors = colors,
                        onClick = store::checkLiveCatalog,
                        leadingIcon = Icons.Rounded.Visibility,
                    )
                    NativeSecondaryButton(
                        label = "Sync now",
                        colors = colors,
                        onClick = store::syncCatalogNow,
                        leadingIcon = Icons.Rounded.Refresh,
                    )
                }
                NativeActionRow {
                    NativeSecondaryButton(
                        label = "Open website",
                        colors = colors,
                        onClick = { uriHandler.openUri(store.siteBaseUrlString) },
                    )
                    NativeSecondaryButton(
                        label = "Open manifest",
                        colors = colors,
                        onClick = { uriHandler.openUri(store.catalogManifestUrlString) },
                    )
                }
            }
        }

        item {
            NativeScreenCard(colors = colors) {
                SectionLabel(text = "Slug probe")
                Text(
                    text = "Use a freshly published slug here to force the OTA path instead of waiting for the passive refresh window.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                OutlinedTextField(
                    value = store.testingSlug,
                    onValueChange = { store.testingSlug = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Testing slug") },
                    placeholder = { Text("new-word-slug") },
                    singleLine = true,
                )
                NativeActionRow {
                    NativeSecondaryButton(
                        label = "Use suggested slug",
                        colors = colors,
                        onClick = { store.testingSlug = store.suggestedTestSlug.orEmpty() },
                    )
                    NativePrimaryButton(
                        label = "Probe slug",
                        colors = colors,
                        onClick = store::probeSlug,
                        leadingIcon = Icons.Rounded.Visibility,
                    )
                    NativeSecondaryButton(
                        label = "Sync first",
                        colors = colors,
                        onClick = store::syncCatalogNow,
                        leadingIcon = Icons.Rounded.Refresh,
                    )
                    NativeSecondaryButton(
                        label = "Simulate push tap",
                        colors = colors,
                        onClick = store::simulatePushTap,
                        leadingIcon = Icons.Rounded.Notifications,
                    )
                }
                store.testingError?.let { testingError ->
                    Text(
                        text = testingError,
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.warning,
                    )
                }
            }
        }

        item {
            NativeScreenCard(colors = colors) {
                SectionLabel(text = "Push diagnostics")
                NativeSettingsValueRow(
                    label = "Opt-in status",
                    value = store.pushOptInStatus.wireValue,
                )
                NativeSettingsValueRow(
                    label = "FCM token",
                    value = store.pushFcmToken?.take(32)?.let { "$it…" } ?: "—",
                )
                store.pushRegistrationError?.let { error ->
                    Text(
                        text = error,
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.warning,
                    )
                }
                Text(
                    text = store.pushTestingMessage,
                    style = MaterialTheme.typography.bodyMedium,
                )
                if (BuildConfig.NATIVE_PUSH_CONFIGURED &&
                    store.pushOptInStatus != PushOptInStatus.authorized) {
                    NativePrimaryButton(
                        label = "Enable notifications",
                        colors = colors,
                        onClick = store::requestPushOptIn,
                        leadingIcon = Icons.Rounded.Notifications,
                    )
                }
            }
        }
        }
    }
}

@Composable
fun NativeCategoriesScreen(
    store: NativeDictionaryStore,
    colors: NativeColors,
    padding: PaddingValues,
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .testTag(NativeUiTags.CategoriesScreen),
        contentPadding = mainScreenPadding(padding),
        verticalArrangement = Arrangement.spacedBy(NativeLayout.sectionGap),
    ) {
        item {
            NativeScreenCard(colors = colors, emphasis = true) {
                SectionLabel(text = "Categories")
                Text(
                    text = "The catalogue sorted by editorial theme.",
                    style = MaterialTheme.typography.bodyLarge,
                )
            }
        }
        items(store.categoryStats) { category ->
            NativeCard(colors = colors, onClick = { store.presentCategory(category.slug) }) {
                Text(
                    text = category.title,
                    style = MaterialTheme.typography.headlineSmall,
                )
                Text(
                    text = category.description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                NativeChip(
                    label = "${category.count} entries",
                    colors = colors,
                    accent = true,
                )
            }
        }
    }
}

@Composable
private fun HomePushPromptCard(
    store: NativeDictionaryStore,
    colors: NativeColors,
) {
    val title: String
    val body: String
    val actionLabel: String
    when (store.pushOptInStatus) {
        PushOptInStatus.denied -> {
            title = "Notifications are off"
            body = "Turn them on in system settings to receive the daily word."
            actionLabel = "Open settings"
        }
        PushOptInStatus.unsupported -> {
            title = "Notifications unavailable"
            body = "This device can't deliver push notifications for the dictionary."
            actionLabel = ""
        }
        else -> {
            title = "Get the daily word"
            body = "A single push each morning with a fresh entry from the book. No other interruptions."
            actionLabel = "Enable notifications"
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        SectionLabel(text = title)
        Text(
            text = body,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        if (actionLabel.isNotEmpty()) {
            NativePrimaryButton(
                label = actionLabel,
                colors = colors,
                onClick = store::requestPushOptIn,
                leadingIcon = Icons.Rounded.Notifications,
            )
        }
    }
}

@Composable
private fun NativeSettingsValueRow(
    label: String,
    value: String,
) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        SectionLabel(text = label)
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
        )
    }
}

private fun themeSwatches(theme: SiteTheme): List<Color> =
    when (theme) {
        SiteTheme.book -> listOf(Color(0xFFB2552F), Color(0xFF26594A), Color(0xFFF4EFE6))
        SiteTheme.codex -> listOf(Color(0xFF0169CC), Color(0xFF751ED9), Color(0xFFF3F8FD))
        SiteTheme.absolutely -> listOf(Color(0xFFCC7D5E), Color(0xFFF9F9F7), Color(0xFF2D2D2B))
        SiteTheme.night -> listOf(Color(0xFFE4864D), Color(0xFF5EC9A1), Color(0xFF12100D))
    }
