package com.djngoma.devilsaidictionary

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.MenuBook
import androidx.compose.material.icons.rounded.AutoStories
import androidx.compose.material.icons.rounded.FilterList
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material.icons.rounded.Shuffle
import androidx.compose.material.icons.rounded.Visibility
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
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
                Text(
                    text = "The Devil's AI Dictionary",
                    style = MaterialTheme.typography.headlineLarge,
                )
                Text(
                    text = "A sceptical field guide to the language machines, marketers, founders, and consultants use when they want to sound smarter than they are.",
                    style = MaterialTheme.typography.bodyLarge,
                )
                Text(
                    text = "This Android edition reads the bundled catalogue natively, remembers your place on-device, and uses Android chrome instead of a WebView in a fake moustache.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                NativeActionRow {
                    NativePrimaryButton(
                        label = "Read the book",
                        colors = colors,
                        onClick = store::presentBook,
                        leadingIcon = Icons.Rounded.AutoStories,
                    )
                    NativeSecondaryButton(
                        label = "Random entry",
                        colors = colors,
                        onClick = store::openRandomEntry,
                        leadingIcon = Icons.Rounded.Shuffle,
                    )
                }
            }
        }

        store.currentWord?.let { currentWord ->
            item {
                NativeScreenCard(colors = colors) {
                    SectionLabel(text = "Current word")
                    Text(
                        text = currentWord.title,
                        style = MaterialTheme.typography.headlineMedium,
                    )
                    NativeChip(
                        label = formatDisplayDate(currentWord.updatedAt),
                        colors = colors,
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
                        NativeSecondaryButton(
                            label = "Refresh",
                            colors = colors,
                            onClick = store::refreshCurrentWord,
                            leadingIcon = Icons.Rounded.Refresh,
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
                        onClick = { category -> store.showBrowseCategory(category.slug) },
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
fun NativeBrowseScreen(
    store: NativeDictionaryStore,
    colors: NativeColors,
    padding: PaddingValues,
) {
    var categorySheetOpen by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .testTag(NativeUiTags.BrowseScreen),
        contentPadding = mainScreenPadding(padding),
        verticalArrangement = Arrangement.spacedBy(NativeLayout.sectionGap),
    ) {
        item {
            NativeScreenCard(colors = colors) {
                SectionLabel(text = "Browse")
                Text(
                    text = "Walk the catalogue by letter or narrow it to one shelf at a time.",
                    style = MaterialTheme.typography.bodyLarge,
                )
                store.latestPublishedAt?.let { latestPublishedAt ->
                    Text(
                        text = "Last words added ${formatDisplayDate(latestPublishedAt)}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    item {
                        NativeChip(
                            label = "All letters",
                            colors = colors,
                            selected = store.browseLetter == null,
                            onClick = { store.browseLetter = null },
                        )
                    }
                    items(store.letterOptions) { letter ->
                        NativeChip(
                            label = letter,
                            colors = colors,
                            selected = store.browseLetter == letter,
                            onClick = { store.browseLetter = letter },
                        )
                    }
                }
                NativeActionRow {
                    NativeSecondaryButton(
                        label = store.categoryTitle(store.browseCategorySlug) ?: "All categories",
                        colors = colors,
                        onClick = { categorySheetOpen = true },
                        leadingIcon = Icons.Rounded.FilterList,
                    )
                    if (store.browseCategorySlug != null || store.browseLetter != null) {
                        NativeSecondaryButton(
                            label = "Clear filters",
                            colors = colors,
                            onClick = {
                                store.browseLetter = null
                                store.browseCategorySlug = null
                            },
                        )
                    }
                }
            }
        }

        if (store.browseSections.isEmpty()) {
            item {
                NativeEmptyState(
                    title = "Nothing matches this shelf",
                    body = "Try a different letter, clear the category, or go back to the full catalogue.",
                    colors = colors,
                    primaryLabel = "Clear filters",
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

    if (categorySheetOpen) {
        NativeFilterSheet(
            title = "Browse filters",
            colors = colors,
            onDismiss = { categorySheetOpen = false },
        ) {
            Text(
                text = "Choose a category, or reset back to the whole catalogue.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            NativeActionRow {
                NativeChip(
                    label = "All categories",
                    colors = colors,
                    selected = store.browseCategorySlug == null,
                    onClick = {
                        store.browseCategorySlug = null
                        categorySheetOpen = false
                    },
                )
                store.categoryStats.forEach { category ->
                    NativeChip(
                        label = category.title,
                        colors = colors,
                        selected = store.browseCategorySlug == category.slug,
                        onClick = {
                            store.browseCategorySlug = category.slug
                            categorySheetOpen = false
                        },
                    )
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
            NativeScreenCard(colors = colors) {
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
            NativeScreenCard(colors = colors) {
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
                    primaryLabel = "Browse entries",
                    onPrimary = { store.selectTab(NativeTab.Browse) },
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
                    SectionLabel(text = "Current word")
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
                    label = "Push readiness",
                    value = if (BuildConfig.NATIVE_PUSH_CONFIGURED) {
                        "Config present, client wiring pending"
                    } else {
                        "Not configured"
                    },
                )
                Text(
                    text = store.pushTestingMessage,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
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
