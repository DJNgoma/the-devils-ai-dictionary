package com.djngoma.devilsaidictionary

import androidx.compose.foundation.border
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
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NativeHomeScreen(
    store: NativeDictionaryStore,
    colors: NativeColors,
    padding: PaddingValues,
) {
    PullToRefreshBox(
        isRefreshing = store.isRefreshingCatalog,
        onRefresh = store::syncCatalogNow,
        modifier = Modifier.fillMaxSize(),
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
                        modifier = Modifier.weight(1f),
                    )
                    NativeSecondaryButton(
                        label = "Random entry",
                        colors = colors,
                        onClick = store::openRandomEntry,
                        modifier = Modifier.weight(1f),
                    )
                }
                store.catalogSyncStatusMessage?.let { message ->
                    CatalogSyncStatusCard(
                        message = message,
                        isRefreshing = store.isRefreshingCatalog,
                        isError = store.catalogSyncStatusIsError,
                        colors = colors,
                    )
                }
                if (store.pushManager != null &&
                    store.shouldShowPushPrompt) {
                    HomePushPromptCard(
                        store = store,
                        colors = colors,
                    )
                }
            }
        }

        store.currentWord?.let { currentWord ->
            item {
                NativeScreenCard(colors = colors) {
                    val todayEntry = store.entry(currentWord.slug)

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
                    NativeActionRow {
                        NativePrimaryButton(
                            label = "Open",
                            colors = colors,
                            onClick = store::openCurrentWord,
                        )
                        if (todayEntry != null) {
                            ConfirmingSaveButton(
                                label = "Save word",
                                colors = colors,
                                onClick = { store.save(todayEntry) },
                            )
                        }
                        NativeSecondaryButton(
                            label = "Share",
                            colors = colors,
                            onClick = store::shareCurrentWord,
                        )
                    }
                }
            }
        }

        if (store.glossaryCategoryStats.isNotEmpty()) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    SectionLabel(text = "Glossary — start here")
                    CategoryGrid(
                        categories = store.glossaryCategoryStats,
                        colors = colors,
                        onClick = { category -> store.presentCategory(category.slug) },
                    )
                }
            }
        }

        if (store.nonGlossaryCategoryStats.isNotEmpty()) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    SectionLabel(text = "Browse by category")
                    CategoryGrid(
                        categories = store.nonGlossaryCategoryStats,
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
                    )
                    if (store.searchQuery.isNotBlank() || store.hasSearchFilters) {
                        NativeSecondaryButton(
                            label = "Clear filters",
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
                        store.searchLetter?.let { letter ->
                            NativeChip(
                                label = "Letter $letter",
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
                    secondaryLabel = "Clear filters",
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
                    label = "Clear filters",
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
                            label = "Open word",
                            colors = colors,
                            onClick = store::openSavedPlace,
                        )
                        ConfirmRemoveButton(
                            colors = colors,
                            onConfirmed = store::clearSavedPlace,
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
                Text(
                    text = "Auto keeps to Book in light mode and Night after dark. Turn it off if this device deserves a more opinionated edition.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "Auto appearance",
                        style = MaterialTheme.typography.bodyLarge,
                        modifier = Modifier.weight(1f),
                    )
                    Switch(
                        checked = store.siteThemeMode == SiteThemeMode.auto,
                        onCheckedChange = { enabled ->
                            store.setThemeMode(if (enabled) SiteThemeMode.auto else SiteThemeMode.manual)
                        },
                    )
                }

                if (store.siteThemeMode == SiteThemeMode.auto) {
                    Text(
                        text = "Currently using ${store.siteTheme.label}, because this device is in ${if (store.siteTheme.isDark) "dark" else "light"} appearance.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                } else {
                    ThemeAppearanceGroup.entries.forEach { appearance ->
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            SectionLabel(text = appearance.label)
                            SiteTheme.entries
                                .filter { it.appearanceGroup == appearance }
                                .forEach { theme ->
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
                                                        .background(color, CircleShape)
                                                        .border(1.dp, Color.Black, CircleShape),
                                                )
                                            }
                                        }
                                        Spacer(modifier = Modifier.width(12.dp))
                                        Text(
                                            text = theme.label,
                                            style = MaterialTheme.typography.bodyLarge,
                                            modifier = Modifier.weight(1f),
                                        )
                                        if (theme == store.manualSiteTheme) {
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
                }
            }
        }

        item {
            NativeScreenCard(colors = colors) {
                SectionLabel(text = "Notifications")
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "Daily word notifications",
                        style = MaterialTheme.typography.bodyLarge,
                        modifier = Modifier.weight(1f),
                    )
                    Switch(
                        checked = store.pushNotificationsPreferenceEnabled,
                        onCheckedChange = { enabled -> store.setPushNotificationsEnabled(enabled) },
                        enabled = store.pushManager != null,
                    )
                }
                Text(
                    text = store.pushStatusMessage,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                SimpleDropdown(
                    label = "Delivery hour",
                    value = store.pushPreferredDeliveryHourLabel,
                    options = (0..23).map { hour -> formatPushDeliveryHour(hour) to hour },
                    onSelected = { hour ->
                        if (hour != null) {
                            store.setPushPreferredDeliveryHour(hour)
                        }
                    },
                )
                Text(
                    text = "Local time on this device. Android now keeps the daily word on its own schedule instead of waiting for an hourly server poll.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (store.shouldShowPushPrompt) {
                    NativeSecondaryButton(
                        label = store.pushPermissionButtonTitle,
                        colors = colors,
                        onClick = store::handlePushPermissionAction,
                    )
                }
            }
        }

        item {
            NativeScreenCard(colors = colors) {
                SectionLabel(text = "Review")
                Text(
                    text = store.reviewStatusMessage,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                NativeSecondaryButton(
                    label = store.reviewActionTitle,
                    colors = colors,
                    onClick = store::openAppReviewPage,
                )
            }
        }

        if (store.developerModeAvailable) {
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
                store.catalogSyncStatusMessage?.let { message ->
                    CatalogSyncStatusCard(
                        message = message,
                        isRefreshing = store.isRefreshingCatalog,
                        isError = store.catalogSyncStatusIsError,
                        colors = colors,
                    )
                }
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
                        label = store.syncCatalogButtonLabel,
                        colors = colors,
                        onClick = store::syncCatalogNow,
                        enabled = !store.isRefreshingCatalog,
                    )
                    NativeSecondaryButton(
                        label = "Check live site",
                        colors = colors,
                        onClick = store::checkLiveCatalog,
                        enabled = !store.isCheckingLiveCatalog,
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
                    )
                    NativeSecondaryButton(
                        label = store.syncCatalogButtonLabel,
                        colors = colors,
                        onClick = store::syncCatalogNow,
                        enabled = !store.isRefreshingCatalog,
                    )
                    NativeSecondaryButton(
                        label = "Simulate notification tap",
                        colors = colors,
                        onClick = store::simulatePushTap,
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
                    label = "Next local fire",
                    value = store.pushNextScheduledFireLabel ?: "—",
                )
                NativeSettingsValueRow(
                    label = "Editorial date",
                    value = store.pushNextScheduledEditorialDateKey ?: "—",
                )
                NativeSettingsValueRow(
                    label = "Scheduled catalogue",
                    value = store.pushScheduledCatalogVersion ?: "—",
                )
                NativeSettingsValueRow(
                    label = "Scheduled hour",
                    value = store.pushScheduledDeliveryHour?.let(::formatPushDeliveryHour) ?: "—",
                )
                NativeSettingsValueRow(
                    label = "Device time zone",
                    value = store.pushScheduledTimeZoneId ?: "—",
                )
                NativeSettingsValueRow(
                    label = "Last delivered editorial day",
                    value = store.pushLastDeliveredEditorialDateKey ?: "—",
                )
                store.pushSchedulingError?.let { error ->
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
                if (store.pushManager != null && store.shouldShowPushPrompt) {
                    NativePrimaryButton(
                        label = store.pushPermissionButtonTitle,
                        colors = colors,
                        onClick = store::handlePushPermissionAction,
                    )
                }
            }
        }
        }
    }
}

@Composable
private fun CatalogSyncStatusCard(
    message: String,
    isRefreshing: Boolean,
    isError: Boolean,
    colors: NativeColors,
) {
    val tint = if (isError) colors.warning else MaterialTheme.colorScheme.onSurfaceVariant
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                color = if (isError) colors.warning.copy(alpha = 0.12f) else colors.surfaceMuted,
                shape = MaterialTheme.shapes.medium,
            )
            .border(
                width = 1.dp,
                color = if (isError) colors.warning.copy(alpha = 0.24f) else colors.border,
                shape = MaterialTheme.shapes.medium,
            )
            .padding(12.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.Top,
    ) {
        if (isRefreshing) {
            CircularProgressIndicator(
                modifier = Modifier.size(16.dp),
                color = colors.accent,
                strokeWidth = 2.dp,
            )
        } else {
            Icon(
                imageVector = Icons.Rounded.Refresh,
                contentDescription = null,
                tint = tint,
                modifier = Modifier.size(16.dp),
            )
        }
        Text(
            text = message,
            style = MaterialTheme.typography.bodySmall,
            color = tint,
        )
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
        if (store.glossaryCategoryStats.isNotEmpty()) {
            item {
                SectionLabel(text = "Glossary — start here")
            }
            items(store.glossaryCategoryStats) { category ->
                CategoryListCard(category = category, colors = colors) {
                    store.presentCategory(category.slug)
                }
            }
        }
        if (store.nonGlossaryCategoryStats.isNotEmpty()) {
            item {
                SectionLabel(text = "All categories")
            }
            items(store.nonGlossaryCategoryStats) { category ->
                CategoryListCard(category = category, colors = colors) {
                    store.presentCategory(category.slug)
                }
            }
        }
    }
}

@Composable
private fun CategoryListCard(
    category: CategoryStat,
    colors: NativeColors,
    onClick: () -> Unit,
) {
    NativeCard(colors = colors, onClick = onClick) {
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
            title = "The daily word is waiting outside"
            body = "Android has notifications barred in Settings. Reopen the door there if you want delivery."
            actionLabel = "Open Settings"
        }
        PushOptInStatus.unsupported -> {
            title = "Notifications unavailable"
            body = "This device can't deliver push notifications for the dictionary."
            actionLabel = ""
        }
        else -> {
            title = "Let the daily word find you"
            body = "One entry a day, on this phone, at the hour you choose. Useful correspondence, not a campaign."
            actionLabel = "Send the daily word"
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
                onClick = store::handlePushPermissionAction,
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
        SiteTheme.devil -> listOf(Color(0xFFC92A2A), Color(0xFFF08B57), Color(0xFF170909))
        SiteTheme.night -> listOf(Color(0xFFE4864D), Color(0xFF5EC9A1), Color(0xFF12100D))
    }
