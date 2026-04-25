package com.djngoma.devilsaidictionary

import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest
import java.text.DateFormat
import java.text.ParseException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.Executors

enum class NativeTab {
    Home,
    Search,
    Categories,
    Saved,
    Settings,
}

enum class ThemeAppearanceGroup(val label: String) {
    light("Light editions"),
    dark("Dark editions"),
}

enum class SiteThemeMode {
    auto,
    manual,
}

enum class SiteTheme(
    val label: String,
    val appearanceGroup: ThemeAppearanceGroup,
) {
    book("Book", ThemeAppearanceGroup.light),
    codex("Codex", ThemeAppearanceGroup.light),
    absolutely("Absolutely", ThemeAppearanceGroup.light),
    devil("Devil", ThemeAppearanceGroup.dark),
    night("Night", ThemeAppearanceGroup.dark),

    ;

    val isDark: Boolean
        get() = appearanceGroup == ThemeAppearanceGroup.dark
}

sealed interface NativeOverlay {
    data object About : NativeOverlay
    data object Book : NativeOverlay
    data object Guide : NativeOverlay
    data class EntryDetail(val slug: String) : NativeOverlay
    data class Category(val slug: String) : NativeOverlay
    data class RelatedTerms(val slug: String) : NativeOverlay
}

enum class Difficulty {
    beginner,
    intermediate,
    advanced,
}

enum class TechnicalDepth {
    low,
    medium,
    high,
}

enum class HypeLevel {
    low,
    medium,
    high,
    severe,
}

enum class VendorFilter {
    all,
    vendorOnly,
    nonVendorOnly,
}

enum class CurrentWordSource {
    seeded,
    manualRefresh,
    deepLink,
    notificationTap,
    localNotification,
    phoneSync,
}

private const val DEFAULT_PUSH_DELIVERY_HOUR = 9

fun formatPushDeliveryHour(hour: Int): String =
    String.format(Locale.US, "%02d:00", hour.coerceIn(0, 23))

data class Translation(
    val label: String,
    val text: String,
)

data class BookmarkRecord(
    val href: String,
    val title: String,
    val label: String,
    val description: String?,
    val savedAt: String,
)

data class CurrentWordRecord(
    val slug: String,
    val title: String,
    val devilDefinition: String,
    val plainDefinition: String,
    val warningLabel: String?,
    val updatedAt: String,
    val source: CurrentWordSource,
)

data class Entry(
    val title: String,
    val slug: String,
    val letter: String,
    val categories: List<String>,
    val aliases: List<String>,
    val devilDefinition: String,
    val plainDefinition: String,
    val whyExists: String,
    val misuse: String,
    val practicalMeaning: String,
    val example: String,
    val askNext: List<String>,
    val related: List<String>,
    val seeAlso: List<String>,
    val difficulty: Difficulty,
    val technicalDepth: TechnicalDepth,
    val hypeLevel: HypeLevel,
    val isVendorTerm: Boolean,
    val publishedAt: String,
    val updatedAt: String,
    val warningLabel: String?,
    val vendorReferences: List<String>,
    val note: String?,
    val tags: List<String>,
    val misunderstoodScore: Int,
    val translations: List<Translation>,
    val diagram: String?,
    val body: String,
    val categorySlugs: List<String>,
    val url: String,
    val searchText: String,
    val relatedSlugs: List<String>,
)

data class LetterStat(
    val letter: String,
    val count: Int,
    val href: String,
)

data class CategoryStat(
    val title: String,
    val description: String,
    val slug: String,
    val count: Int,
    val sampleTerms: List<String>,
)

val GLOSSARY_CATEGORY_SLUGS = setOf("cultural-terms", "product-and-vendor-terms")

data class EntrySection(
    val title: String,
    val entries: List<Entry>,
)

class DictionaryCatalog internal constructor(
    private val handle: SwiftCoreBridge.CatalogHandle,
) {
    private val meta = handle.metadata

    val entries: List<Entry> get() = handle.allEntries
    val letterStats: List<LetterStat> get() = meta.letterStats
    val categoryStats: List<CategoryStat> get() = meta.categoryStats
    val featuredSlug: String get() = meta.featuredSlug
    val latestPublishedAt: String get() = meta.latestPublishedAt
    val editorialTimeZone: String get() = meta.editorialTimeZone

    fun entry(slug: String): Entry? = handle.entry(slug)

    fun entriesFor(slugs: List<String>): List<Entry> = handle.entriesFor(slugs)

    fun featuredEntry(): Entry? = handle.featuredEntry()

    fun dailyWord(): Entry? = handle.dailyWord()

    fun dailyWordAt(timestampMs: Long): Entry? = handle.dailyWordAt(timestampMs / 1000)

    fun dailyWordSlugAt(timestampMs: Long): String? = handle.dailyWordSlugAt(timestampMs / 1000)

    fun recentEntries(limit: Int = 4): List<Entry> = handle.recentEntries(limit)

    fun misunderstoodEntries(limit: Int = 4): List<Entry> = handle.misunderstoodEntries(limit)

    fun randomEntry(excluding: String? = null): Entry? = handle.randomEntry(excluding)

    fun filteredEntries(
        categorySlug: String? = null,
        difficulty: Difficulty? = null,
        technicalDepth: TechnicalDepth? = null,
        vendorFilter: VendorFilter = VendorFilter.all,
        letter: String? = null,
    ): List<Entry> = handle.filteredEntries(categorySlug, difficulty, technicalDepth, vendorFilter, letter)
}

class NativeDictionaryStore(
    context: Context,
    val pushManager: PhonePushManager? = null,
    private val openPushSettings: (() -> Unit)? = null,
    private val requestPushPermission: (() -> Unit)? = null,
    private val launchInAppReview: (() -> Unit)? = null,
    private val openAppReviewListing: (() -> Unit)? = null,
) {
    private val appContext = context.applicationContext
    private val storage = NativeDictionaryStorage(
        appContext.getSharedPreferences("native-dictionary-store", Context.MODE_PRIVATE),
    )
    private val catalogDiskStore = CatalogDiskStore(appContext)
    private val catalogUpdateClient = CatalogUpdateClient(BuildConfig.CATALOG_MANIFEST_URL.toUrl())
    private val mainHandler = Handler(Looper.getMainLooper())
    private val backgroundExecutor = Executors.newSingleThreadExecutor()

    private var catalog: DictionaryCatalog? = null
    private var pendingMissingSlugRetry: String? = null
    private var pendingMissingSlugRetrySource: CurrentWordSource? = null

    var selectedTab by mutableStateOf(NativeTab.Home)
        private set

    var activeOverlay by mutableStateOf<NativeOverlay?>(null)
        private set

    var searchLetter by mutableStateOf<String?>(null)
    private var searchQueryState by mutableStateOf("")
    var searchQuery: String
        get() = searchQueryState
        set(value) {
            searchQueryState = value
            if (value.isNotBlank()) {
                searchLetter = null
            }
        }
    var searchCategorySlug by mutableStateOf<String?>(null)
    var searchDifficulty by mutableStateOf<Difficulty?>(null)
    var searchTechnicalDepth by mutableStateOf<TechnicalDepth?>(null)
    var searchVendorFilter by mutableStateOf(VendorFilter.all)

    var siteThemeMode by mutableStateOf(storage.loadThemeMode())
        private set

    var manualSiteTheme by mutableStateOf(storage.loadTheme())
        private set

    var siteTheme by mutableStateOf(resolveTheme(storage.loadThemeMode(), storage.loadTheme(), false))
        private set

    private var systemDarkMode by mutableStateOf(false)

    val developerModeAvailable = BuildConfig.DEVELOPER_MODE_AVAILABLE

    var developerMode by mutableStateOf(
        resolveDeveloperModeEnabled(
            developerModeAvailable = developerModeAvailable,
            storedDeveloperMode = storage.loadDeveloperMode(),
        ),
    )

    var currentWord by mutableStateOf<CurrentWordRecord?>(null)
        private set

    var catalogVersion by mutableStateOf<String?>(null)
        private set

    var savedPlace by mutableStateOf<BookmarkRecord?>(null)
        private set

    var loadError by mutableStateOf<String?>(null)
        private set

    var isRefreshingCatalog by mutableStateOf(false)
        private set

    var isCheckingLiveCatalog by mutableStateOf(false)
        private set

    var testingSlug by mutableStateOf("")

    var testingError by mutableStateOf<String?>(null)
        private set

    internal var liveCatalogManifest by mutableStateOf<CatalogManifest?>(null)
        private set

    var liveCatalogCheckedAtMs by mutableStateOf<Long?>(null)
        private set

    var liveCatalogError by mutableStateOf<String?>(null)
        private set

    var lastCatalogCheckAtMs by mutableStateOf(storage.loadCatalogManifestCheckedAtMs())
        private set

    var savedToast by mutableStateOf<String?>(null)
        private set

    private var pushOptInStatusState by mutableStateOf(pushManager?.optInStatus ?: PushOptInStatus.unsupported)
    private var pushNotificationsPreferenceConfiguredState by mutableStateOf(
        pushManager?.notificationsPreferenceConfigured ?: false,
    )
    private var pushNotificationsPreferenceEnabledState by mutableStateOf(
        pushManager?.notificationsPreferenceEnabled ?: false,
    )
    private var pushPreferredDeliveryHourState by mutableStateOf(
        pushManager?.preferredDeliveryHour ?: DEFAULT_PUSH_DELIVERY_HOUR,
    )
    private var pushNotificationsEnabledState by mutableStateOf(
        pushManager?.notificationsEnabled ?: false,
    )
    private var pushScheduledCatalogVersionState by mutableStateOf(pushManager?.scheduledCatalogVersion)
    private var pushScheduledDeliveryHourState by mutableStateOf(pushManager?.scheduledDeliveryHour)
    private var pushScheduledTimeZoneIdState by mutableStateOf(pushManager?.scheduledTimeZoneId)
    private var pushNextScheduledFireAtMsState by mutableStateOf(pushManager?.nextScheduledFireAtMs)
    private var pushNextScheduledEditorialDateKeyState by mutableStateOf(pushManager?.nextScheduledEditorialDateKey)
    private var pushLastDeliveredEditorialDateKeyState by mutableStateOf(pushManager?.lastDeliveredEditorialDateKey)
    private var pushSchedulingErrorState by mutableStateOf(pushManager?.lastSchedulingError)

    fun consumeSavedToast() {
        savedToast = null
    }

    init {
        if (!developerModeAvailable && storage.loadDeveloperMode()) {
            storage.saveDeveloperMode(false)
        }
        savedPlace = storage.loadSavedPlace()
        loadCatalog()
        seedCurrentWordIfNeeded()
        refreshPushState()
        testingSlug = recentEntries.firstOrNull()?.slug ?: currentWord?.slug.orEmpty()
        refreshCatalogInBackground()
    }

    val entries: List<Entry>
        get() = catalog?.entries ?: emptyList()

    val featuredEntry: Entry?
        get() = catalog?.featuredEntry()

    val recentEntries: List<Entry>
        get() = catalog?.recentEntries() ?: emptyList()

    val latestPublishedAt: String?
        get() = catalog?.latestPublishedAt

    val appVersionLabel: String
        get() = "${BuildConfig.APP_VERSION_NAME} (${BuildConfig.APP_VERSION_CODE})"

    val siteBaseUrlString: String
        get() = "https://thedevilsaidictionary.com"

    val catalogManifestUrlString: String
        get() = BuildConfig.CATALOG_MANIFEST_URL

    val reviewStatusMessage: String
        get() = "After a respectable amount of reading, the app may ask for a review. It has the manners not to ask on launch."

    val reviewActionTitle: String
        get() = "Review it on Google Play"

    val deviceEntryCount: Int
        get() = entries.size

    val bundledCatalogVersion: String?
        get() = storage.loadBundledCatalogVersion()

    val misunderstoodEntries: List<Entry>
        get() = catalog?.misunderstoodEntries() ?: emptyList()

    val categoryStats: List<CategoryStat>
        get() = catalog?.categoryStats ?: emptyList()

    val glossaryCategoryStats: List<CategoryStat>
        get() = categoryStats.filter { it.slug in GLOSSARY_CATEGORY_SLUGS }

    val nonGlossaryCategoryStats: List<CategoryStat>
        get() = categoryStats.filterNot { it.slug in GLOSSARY_CATEGORY_SLUGS }

    val letterOptions: List<String>
        get() = categoryAwareLetters(catalog?.letterStats ?: emptyList())

    val hasSearchFilters: Boolean
        get() = searchLetter != null ||
            searchCategorySlug != null ||
            searchDifficulty != null ||
            searchTechnicalDepth != null ||
            searchVendorFilter != VendorFilter.all

    val searchResults: List<Entry>
        get() {
            val filtered = catalog?.filteredEntries(
                categorySlug = searchCategorySlug,
                difficulty = searchDifficulty,
                technicalDepth = searchTechnicalDepth,
                vendorFilter = searchVendorFilter,
                letter = searchLetter,
            ) ?: emptyList()
            val trimmedQuery = searchQuery.trim()
            if (trimmedQuery.isEmpty()) {
                return filtered.sortedByCaseInsensitive(Entry::title)
            }

            val tokens = trimmedQuery
                .lowercase(Locale.getDefault())
                .split(Regex("\\s+"))
                .filter(String::isNotBlank)

            return filtered
                .mapNotNull { entry ->
                    val score = scoreSearchMatch(entry, tokens)
                    if (score <= 0) {
                        null
                    } else {
                        entry to score
                    }
                }
                .sortedWith(
                    compareByDescending<Pair<Entry, Int>> { it.second }
                        .thenBy { it.first.title.lowercase(Locale.getDefault()) },
                )
                .map(Pair<Entry, Int>::first)
        }

    val liveCatalogMatchesDevice: Boolean?
        get() {
            val liveCatalogVersion = liveCatalogManifest?.catalogVersion ?: return null
            val localCatalogVersion = catalogVersion ?: return null
            return liveCatalogVersion == localCatalogVersion
        }

    val liveCatalogStatusMessage: String
        get() {
            liveCatalogError?.let { return it }

            val manifest = liveCatalogManifest
                ?: return "Check the live site to compare this build against production."
            val localCatalogVersion = catalogVersion
                ?: return "The live site is reachable, but this build has not loaded a local catalogue yet."

            return if (manifest.catalogVersion == localCatalogVersion) {
                "This device matches the live catalogue."
            } else {
                "The live site has a different catalogue version. Sync now to test the OTA refresh path."
            }
        }

    val pushOptInStatus: PushOptInStatus
        get() = pushOptInStatusState

    val pushNotificationsPreferenceConfigured: Boolean
        get() = pushNotificationsPreferenceConfiguredState

    val pushNotificationsPreferenceEnabled: Boolean
        get() = pushNotificationsPreferenceEnabledState

    val pushPreferredDeliveryHour: Int
        get() = pushPreferredDeliveryHourState

    val pushPreferredDeliveryHourLabel: String
        get() = formatPushDeliveryHour(pushPreferredDeliveryHour)

    val pushNotificationsEnabled: Boolean
        get() = pushNotificationsEnabledState

    val pushScheduledCatalogVersion: String?
        get() = pushScheduledCatalogVersionState

    val pushScheduledDeliveryHour: Int?
        get() = pushScheduledDeliveryHourState

    val pushScheduledTimeZoneId: String?
        get() = pushScheduledTimeZoneIdState

    val pushNextScheduledFireAtMs: Long?
        get() = pushNextScheduledFireAtMsState

    val pushNextScheduledFireLabel: String?
        get() = pushNextScheduledFireAtMs?.let(::formatDisplayDateTime)

    val pushNextScheduledEditorialDateKey: String?
        get() = pushNextScheduledEditorialDateKeyState

    val pushLastDeliveredEditorialDateKey: String?
        get() = pushLastDeliveredEditorialDateKeyState

    val pushSchedulingError: String?
        get() = pushSchedulingErrorState

    val shouldShowPushPrompt: Boolean
        get() {
            if (pushOptInStatus == PushOptInStatus.unsupported) {
                return false
            }

            if (pushNotificationsPreferenceEnabled) {
                return !pushNotificationsEnabled
            }

            return !pushNotificationsPreferenceConfigured
        }

    val pushPermissionButtonTitle: String
        get() = if (
            pushOptInStatus == PushOptInStatus.denied &&
            pushNotificationsPreferenceEnabled
        ) {
            "Open Settings"
        } else {
            "Allow notifications"
        }

    val pushTestingMessage: String
        get() = when {
            pushManager == null ->
                "Push manager is not attached to this store."
            !pushNotificationsPreferenceEnabled ->
                "Tap \"Enable notifications\" to put the daily word on this phone's local schedule."
            pushOptInStatus == PushOptInStatus.denied ->
                "Notifications are denied for this app. Enable them in system settings to receive daily words."
            pushNotificationsEnabled && pushNextScheduledFireAtMs != null ->
                "Android has scheduled the next daily word locally."
            else ->
                "Allow notifications and the app will keep the daily word on-device."
        }

    val pushStatusMessage: String
        get() = when {
            pushManager == null ->
                "Push has not been attached to this build properly."
            !pushNotificationsPreferenceEnabled ->
                if (pushNotificationsPreferenceConfigured) {
                    "This device is off the daily-word list."
                } else {
                    "Pick an hour and let this phone deliver one civilized interruption a day."
                }
            pushOptInStatus == PushOptInStatus.authorized && pushNextScheduledFireLabel != null ->
                "The next daily word is scheduled on this device for ${pushNextScheduledFireLabel}."
            pushOptInStatus == PushOptInStatus.authorized ->
                "Notifications are allowed; open the app once to rebuild the on-device schedule."
            pushOptInStatus == PushOptInStatus.denied ->
                "The app filed the request. Android barred the door in Settings."
            else ->
                "When Android asks, allow notifications and the app will keep to $pushPreferredDeliveryHourLabel local time."
        }

    fun requestPushOptIn() {
        requestPushPermission?.invoke()
    }

    fun setPushNotificationsEnabled(enabled: Boolean) {
        val manager = pushManager ?: return
        manager.setNotificationsPreferenceEnabled(enabled)
        refreshPushState()

        if (!enabled) {
            return
        }

        if (pushOptInStatus == PushOptInStatus.authorized) {
            return
        }

        if (pushOptInStatus == PushOptInStatus.denied && pushNotificationsPreferenceEnabled) {
            openPushSettings?.invoke()
            return
        }

        requestPushPermission?.invoke()
    }

    fun setPushPreferredDeliveryHour(hour: Int) {
        pushManager?.setPreferredDeliveryHour(hour)
        refreshPushState()
    }

    fun refreshPushState() {
        pushOptInStatusState = pushManager?.optInStatus ?: PushOptInStatus.unsupported
        pushNotificationsPreferenceConfiguredState =
            pushManager?.notificationsPreferenceConfigured ?: false
        pushNotificationsPreferenceEnabledState =
            pushManager?.notificationsPreferenceEnabled ?: false
        pushPreferredDeliveryHourState =
            pushManager?.preferredDeliveryHour ?: DEFAULT_PUSH_DELIVERY_HOUR
        pushNotificationsEnabledState = pushManager?.notificationsEnabled ?: false
        pushScheduledCatalogVersionState = pushManager?.scheduledCatalogVersion
        pushScheduledDeliveryHourState = pushManager?.scheduledDeliveryHour
        pushScheduledTimeZoneIdState = pushManager?.scheduledTimeZoneId
        pushNextScheduledFireAtMsState = pushManager?.nextScheduledFireAtMs
        pushNextScheduledEditorialDateKeyState = pushManager?.nextScheduledEditorialDateKey
        pushLastDeliveredEditorialDateKeyState = pushManager?.lastDeliveredEditorialDateKey
        pushSchedulingErrorState = pushManager?.lastSchedulingError
    }

    fun handlePushPermissionAction() {
        if (pushOptInStatus == PushOptInStatus.denied && pushNotificationsPreferenceEnabled) {
            openPushSettings?.invoke()
            return
        }

        setPushNotificationsEnabled(true)
    }

    fun openAppReviewPage() {
        markReviewPromptAttempt(nowMs = System.currentTimeMillis())
        openAppReviewListing?.invoke()
    }

    fun simulatePushTap() {
        val slug = testingSlug.trim().ifEmpty { suggestedTestSlug.orEmpty() }
        if (slug.isEmpty()) {
            testingError = "No slug available to simulate a push tap."
            return
        }
        handleNotificationSlug(slug, CurrentWordSource.localNotification)
    }

    fun handleNotificationSlug(slug: String, source: CurrentWordSource) {
        activeOverlay = NativeOverlay.EntryDetail(slug)
        val entry = entry(slug)
        if (entry != null) {
            persistCurrentWord(entry.toCurrentWord(source))
            return
        }
        refreshCatalogInBackground(
            force = true,
            retrySlug = slug,
            retrySource = source,
        )
    }

    val suggestedTestSlug: String?
        get() = recentEntries.firstOrNull()?.slug ?: currentWord?.slug

    val savedEntry: Entry?
        get() = slugFromDictionaryPath(savedPlace?.href)?.let(::entry)

    fun entry(slug: String): Entry? = catalog?.entry(slug)

    fun relatedEntriesFor(entry: Entry): List<Entry> {
        val explicit = catalog?.entriesFor(entry.relatedSlugs).orEmpty()
        if (explicit.isNotEmpty()) {
            return explicit
        }

        val fallbackCategory = entry.categorySlugs.firstOrNull() ?: return emptyList()
        return entries
            .filter { candidate ->
                candidate.slug != entry.slug && candidate.categorySlugs.contains(fallbackCategory)
            }
            .take(3)
    }

    fun categoryTitle(slug: String?): String? {
        if (slug == null) {
            return null
        }

        return categoryStats.firstOrNull { it.slug == slug }?.title
    }

    fun selectTab(tab: NativeTab) {
        selectedTab = tab
    }

    fun checkLiveCatalogIfNeeded() {
        if (liveCatalogManifest != null || liveCatalogCheckedAtMs != null || liveCatalogError != null || isCheckingLiveCatalog) {
            return
        }

        checkLiveCatalog()
    }

    fun checkLiveCatalog() {
        if (isCheckingLiveCatalog) {
            return
        }

        isCheckingLiveCatalog = true
        liveCatalogError = null

        backgroundExecutor.execute {
            val result = runCatching { catalogUpdateClient.fetchManifest() }

            mainHandler.post {
                isCheckingLiveCatalog = false
                result.onSuccess { manifestResult ->
                    liveCatalogCheckedAtMs = manifestResult.checkedAtMs
                    liveCatalogManifest = manifestResult.manifest
                }.onFailure { error ->
                    liveCatalogCheckedAtMs = System.currentTimeMillis()
                    liveCatalogManifest = null
                    liveCatalogError =
                        error.message ?: "The Android app could not read the live catalogue manifest."
                }
            }
        }
    }

    fun syncCatalogNow() {
        refreshCatalogInBackground(force = true)
        checkLiveCatalog()
    }

    fun probeSlug() {
        val trimmedSlug = testingSlug.trim()
        if (trimmedSlug.isEmpty()) {
            testingError = "Enter a slug before probing the OTA route."
            return
        }

        testingError = null
        selectedTab = NativeTab.Search
        activeOverlay = NativeOverlay.EntryDetail(trimmedSlug)

        val entry = entry(trimmedSlug)
        if (entry != null) {
            persistCurrentWord(entry.toCurrentWord(CurrentWordSource.deepLink))
            return
        }

        refreshCatalogInBackground(force = true, retrySlug = trimmedSlug)
    }

    fun setTheme(theme: SiteTheme) {
        manualSiteTheme = theme
        storage.saveTheme(theme)

        if (siteThemeMode == SiteThemeMode.manual) {
            siteTheme = theme
        }
    }

    fun setThemeMode(mode: SiteThemeMode) {
        siteThemeMode = mode
        storage.saveThemeMode(mode)
        siteTheme = resolveTheme(mode, manualSiteTheme, systemDarkMode)
    }

    fun updateSystemDarkMode(isDark: Boolean) {
        systemDarkMode = isDark

        if (siteThemeMode == SiteThemeMode.auto) {
            siteTheme = resolveTheme(siteThemeMode, manualSiteTheme, systemDarkMode)
        }
    }

    fun toggleDeveloperMode(enabled: Boolean) {
        val resolvedMode = resolveDeveloperModeEnabled(
            developerModeAvailable = developerModeAvailable,
            storedDeveloperMode = enabled,
        )
        developerMode = resolvedMode
        storage.saveDeveloperMode(resolvedMode)
    }

    fun presentEntry(slug: String) {
        activeOverlay = NativeOverlay.EntryDetail(slug)
        if (entry(slug) == null) {
            refreshCatalogInBackground(force = true, retrySlug = slug)
            return
        }

        recordReviewEntryOpen()
    }

    fun presentEntry(entry: Entry) {
        presentEntry(entry.slug)
    }

    fun presentBook() {
        activeOverlay = NativeOverlay.Book
    }

    fun presentGuide() {
        activeOverlay = NativeOverlay.Guide
    }

    fun presentCategory(slug: String) {
        if (categoryStats.any { it.slug == slug }) {
            activeOverlay = NativeOverlay.Category(slug)
        }
    }

    fun entriesForCategory(slug: String): List<Entry> =
        catalog?.filteredEntries(categorySlug = slug)
            ?.sortedBy { it.title.lowercase() }
            .orEmpty()

    fun presentAbout() {
        activeOverlay = NativeOverlay.About
    }

    fun presentRelatedTerms(slug: String) {
        activeOverlay = NativeOverlay.RelatedTerms(slug)
    }

    fun dismissOverlay() {
        activeOverlay = null
    }

    fun showBrowse(letter: String?) {
        searchLetter = normalizeLetter(letter)
        selectedTab = NativeTab.Search
    }

    fun showBrowseCategory(slug: String?) {
        searchCategorySlug = slug
        selectedTab = NativeTab.Search
    }

    fun showCategoryInSearch(slug: String?) {
        searchCategorySlug = slug
        selectedTab = NativeTab.Search
    }

    fun resetSearchFilters() {
        searchLetter = null
        searchCategorySlug = null
        searchDifficulty = null
        searchTechnicalDepth = null
        searchVendorFilter = VendorFilter.all
    }

    fun save(entry: Entry) {
        persistSavedPlace(
            BookmarkRecord(
                href = "/dictionary/${entry.slug}",
                title = entry.title,
                label = "Dictionary entry",
                description = entry.devilDefinition.trim(),
                savedAt = currentTimestamp(),
            ),
        )
    }

    fun saveBook() {
        persistSavedPlace(
            BookmarkRecord(
                href = "/book",
                title = "The Devil's AI Dictionary",
                label = "Book landing page",
                description = "A field guide for people already in the room.",
                savedAt = currentTimestamp(),
            ),
        )
    }

    fun clearSavedPlace() {
        storage.clearSavedPlace()
        savedPlace = null
    }

    fun openSavedPlace() {
        val bookmark = savedPlace
        if (bookmark == null) {
            selectedTab = NativeTab.Search
            return
        }

        when (bookmark.href) {
            "/book" -> presentBook()
            "/about" -> presentAbout()
            "/how-to-read" -> presentGuide()
            else -> {
                val slug = slugFromDictionaryPath(bookmark.href)
                if (slug == null) {
                    selectedTab = NativeTab.Search
                } else {
                    presentEntry(slug)
                }
            }
        }
    }

    fun openCurrentWord() {
        currentWord?.slug?.let(::presentEntry)
    }

    fun shareCurrentWord() {
        val record = currentWord ?: return
        shareDictionaryItem(
            title = record.title,
            slug = record.slug,
            summary = record.devilDefinition,
        )
    }

    fun openRandomEntry() {
        catalog?.randomEntry(excluding = currentWord?.slug)?.let(::presentEntry)
    }

    fun shareEntry(entry: Entry) {
        shareDictionaryItem(
            title = entry.title,
            slug = entry.slug,
            summary = entry.devilDefinition,
        )
    }

    fun handleIntent(intent: Intent?) {
        if (intent == null) return

        val notificationSlug = intent.getStringExtra(DailyWordNotifications.EXTRA_NOTIFICATION_SLUG)
        if (!notificationSlug.isNullOrEmpty()) {
            val source = notificationSourceFrom(
                intent.getStringExtra(DailyWordNotifications.EXTRA_NOTIFICATION_SOURCE),
            )
            intent.removeExtra(DailyWordNotifications.EXTRA_NOTIFICATION_SLUG)
            intent.removeExtra(DailyWordNotifications.EXTRA_NOTIFICATION_SOURCE)
            intent.removeExtra(DailyWordNotifications.EXTRA_EDITORIAL_DATE_KEY)
            handleNotificationSlug(notificationSlug, source)
            return
        }

        val slug = intent.data?.toDictionarySlug() ?: return
        selectedTab = NativeTab.Search
        activeOverlay = NativeOverlay.EntryDetail(slug)

        val entry = entry(slug)
        if (entry != null) {
            persistCurrentWord(entry.toCurrentWord(CurrentWordSource.deepLink))
            return
        }

        refreshCatalogInBackground(force = true, retrySlug = slug)
    }

    fun handleBack(): Boolean {
        if (activeOverlay != null) {
            dismissOverlay()
            return true
        }

        if (selectedTab != NativeTab.Home) {
            selectedTab = NativeTab.Home
            return true
        }

        return false
    }

    fun onResume() {
        storage.recordReviewForegroundActivation(System.currentTimeMillis())
        refreshCatalogInBackground()
    }

    private fun recordReviewEntryOpen(nowMs: Long = System.currentTimeMillis()) {
        val totalEntryOpens = storage.incrementReviewEntryOpenCount()
        val state = storage.loadReviewPromptState(entryOpenCount = totalEntryOpens)

        if (!ReviewPromptPolicy.shouldPrompt(state, nowMs, BuildConfig.APP_VERSION_NAME)) {
            return
        }

        markReviewPromptAttempt(nowMs)
        launchInAppReview?.invoke()
    }

    private fun markReviewPromptAttempt(nowMs: Long) {
        storage.saveReviewLastPromptAtMs(nowMs)
        storage.saveReviewLastPromptedVersion(BuildConfig.APP_VERSION_NAME)
    }

    private fun loadCatalog() {
        val cachedSnapshot =
            catalogDiskStore.readCatalogBytes()
                ?.let { bytes ->
                    runCatching { parseCatalogSnapshot(bytes) }
                        .onFailure { catalogDiskStore.clear() }
                        .getOrNull()
                }
        val bundledCatalog =
            runCatching {
                val bytes = appContext.assets.open("entries.generated.json").use { input ->
                    input.readBytes()
                }

                parseCatalogSnapshot(bytes) to bytes
            }.getOrNull()

        if (cachedSnapshot != null) {
            if (bundledCatalog != null) {
                val (bundledSnapshot, bundledBytes) = bundledCatalog
                val lastBundledCatalogVersion = storage.loadBundledCatalogVersion()

                storage.saveBundledCatalogVersion(bundledSnapshot.catalogVersion)

                when {
                    cachedSnapshot.catalogVersion == bundledSnapshot.catalogVersion -> {
                        applyCatalogSnapshot(cachedSnapshot)
                    }

                    shouldReplaceCachedCatalogWithBundle(
                        cachedVersion = cachedSnapshot.catalogVersion,
                        bundleVersion = bundledSnapshot.catalogVersion,
                        lastBundledVersion = lastBundledCatalogVersion,
                    ) -> {
                        catalogDiskStore.writeCatalogBytes(bundledBytes)
                        applyCatalogSnapshot(bundledSnapshot)
                    }

                    else -> {
                        applyCatalogSnapshot(cachedSnapshot)
                    }
                }
            } else {
                applyCatalogSnapshot(cachedSnapshot)
            }

            return
        }

        if (bundledCatalog != null) {
            val (bundledSnapshot, bundledBytes) = bundledCatalog
            runCatching {
                catalogDiskStore.writeCatalogBytes(bundledBytes)
                storage.saveBundledCatalogVersion(bundledSnapshot.catalogVersion)
                applyCatalogSnapshot(bundledSnapshot)
            }.onFailure { error ->
                catalog = null
                catalogVersion = null
                loadError = error.message ?: "The Android catalogue could not be loaded from cache or bundle."
            }
            return
        }

        catalog = null
        catalogVersion = null
        loadError = "The Android catalogue could not be loaded from cache or bundle."
    }

    private fun seedCurrentWordIfNeeded() {
        val persisted = storage.loadCurrentWord()
        if (persisted != null && entry(persisted.slug) != null) {
            currentWord = persisted
            return
        }

        val seeded = (catalog?.dailyWord() ?: catalog?.randomEntry())
            ?.toCurrentWord(CurrentWordSource.seeded)
        if (seeded != null) {
            persistCurrentWord(seeded)
        }
    }

    private fun persistSavedPlace(record: BookmarkRecord) {
        storage.saveSavedPlace(record)
        savedPlace = record
        savedToast = "Saved to your reading place."
    }

    private fun persistCurrentWord(record: CurrentWordRecord) {
        storage.saveCurrentWord(record)
        currentWord = record
    }

    private fun applyCatalogSnapshot(snapshot: CatalogSnapshot) {
        catalog = snapshot.catalog
        catalogVersion = snapshot.catalogVersion
        loadError = null
        pushManager?.refresh()
    }

    private fun refreshCatalogInBackground(
        force: Boolean = false,
        retrySlug: String? = null,
        retrySource: CurrentWordSource = CurrentWordSource.deepLink,
    ) {
        if (retrySlug != null) {
            pendingMissingSlugRetry = retrySlug
            pendingMissingSlugRetrySource = retrySource
        }

        val nowMs = System.currentTimeMillis()
        if (!force && !shouldRefreshCatalogManifest(storage.loadCatalogManifestCheckedAtMs(), nowMs)) {
            return
        }

        if (isRefreshingCatalog) {
            return
        }

        isRefreshingCatalog = true
        val currentVersion = catalogVersion
        backgroundExecutor.execute {
            val result =
                runCatching {
                    catalogUpdateClient.fetchUpdate(currentVersion)
                }

            mainHandler.post {
                isRefreshingCatalog = false
                result.onSuccess { update ->
                    when (update) {
                        is CatalogUpdateResult.NoChange -> {
                            recordCatalogManifestCheckedAt(update.checkedAtMs)
                        }

                        is CatalogUpdateResult.UnsupportedSchema -> {
                            recordCatalogManifestCheckedAt(update.checkedAtMs)
                        }

                        is CatalogUpdateResult.Updated -> {
                            runCatching {
                                catalogDiskStore.writeCatalogBytes(update.bytes)
                            }.onSuccess {
                                applyCatalogSnapshot(update.snapshot)
                                recordCatalogManifestCheckedAt(update.checkedAtMs)
                                seedCurrentWordIfNeeded()
                            }
                        }
                    }
                }

                resolvePendingMissingSlugRetry()
            }
        }
    }

    private fun recordCatalogManifestCheckedAt(value: Long) {
        storage.saveCatalogManifestCheckedAtMs(value)
        lastCatalogCheckAtMs = value
    }

    private fun resolvePendingMissingSlugRetry() {
        val slug = pendingMissingSlugRetry ?: return
        val source = pendingMissingSlugRetrySource ?: CurrentWordSource.deepLink
        val entry = entry(slug)

        if (entry != null) {
            persistCurrentWord(entry.toCurrentWord(source))
            selectedTab = NativeTab.Search
            activeOverlay = NativeOverlay.EntryDetail(slug)
        }

        pendingMissingSlugRetry = null
        pendingMissingSlugRetrySource = null
    }

    private fun shareDictionaryItem(
        title: String,
        slug: String,
        summary: String,
    ) {
        val subject = dictionaryShareSubject(title)
        val text = dictionaryShareText(title, slug, summary)

        backgroundExecutor.execute {
            val imageUri = runCatching { cacheShareImage(slug) }.getOrNull()

            mainHandler.post {
                startShareChooser(
                    subject = subject,
                    text = text,
                    title = title,
                    imageUri = imageUri,
                )
            }
        }
    }

    private fun startShareChooser(
        subject: String,
        text: String,
        title: String,
        imageUri: Uri?,
    ) {
        val shareIntent =
            Intent(Intent.ACTION_SEND).apply {
                type = if (imageUri == null) "text/plain" else "image/png"
                putExtra(Intent.EXTRA_SUBJECT, subject)
                putExtra(Intent.EXTRA_TEXT, text)

                if (imageUri != null) {
                    putExtra(Intent.EXTRA_STREAM, imageUri)
                    clipData = ClipData.newUri(
                        appContext.contentResolver,
                        "$title share image",
                        imageUri,
                    )
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
            }

        val chooser =
            Intent.createChooser(shareIntent, dictionaryShareChooserTitle).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

        runCatching {
            appContext.startActivity(chooser)
        }
    }

    private fun cacheShareImage(slug: String): Uri? {
        val connection = dictionaryShareImageUrl(slug).toUrl().openConnection().apply {
            connectTimeout = 3500
            readTimeout = 3500
        }
        val bytes = connection.getInputStream().use { input -> input.readBytes() }

        if (bytes.isEmpty()) {
            return null
        }

        val shareDirectory = File(appContext.cacheDir, "share-images").apply {
            mkdirs()
        }
        val shareFile = File(shareDirectory, dictionaryShareImageFileName(slug))
        shareFile.outputStream().use { output -> output.write(bytes) }

        return FileProvider.getUriForFile(
            appContext,
            "${BuildConfig.APPLICATION_ID}.shareprovider",
            shareFile,
        )
    }
}

private class NativeDictionaryStorage(
    private val preferences: SharedPreferences,
) {
    fun loadSavedPlace(): BookmarkRecord? {
        val raw = preferences.getString(SAVED_PLACE_KEY, null) ?: return null
        return runCatching {
            val json = JSONObject(raw)
            BookmarkRecord(
                href = json.getString("href"),
                title = json.getString("title"),
                label = json.getString("label"),
                description = json.optStringOrNull("description"),
                savedAt = json.getString("savedAt"),
            )
        }.getOrNull()
    }

    fun saveSavedPlace(record: BookmarkRecord) {
        val payload = JSONObject()
            .put("href", record.href)
            .put("title", record.title)
            .put("label", record.label)
            .put("description", record.description)
            .put("savedAt", record.savedAt)
        preferences.edit().putString(SAVED_PLACE_KEY, payload.toString()).apply()
    }

    fun clearSavedPlace() {
        preferences.edit().remove(SAVED_PLACE_KEY).apply()
    }

    fun loadCurrentWord(): CurrentWordRecord? {
        val raw = preferences.getString(CURRENT_WORD_KEY, null) ?: return null
        return runCatching {
            val json = JSONObject(raw)
            CurrentWordRecord(
                slug = json.getString("slug"),
                title = json.getString("title"),
                devilDefinition = json.getString("devilDefinition"),
                plainDefinition = json.getString("plainDefinition"),
                warningLabel = json.optStringOrNull("warningLabel"),
                updatedAt = json.getString("updatedAt"),
                source = CurrentWordSource.valueOf(json.getString("source")),
            )
        }.getOrNull()
    }

    fun saveCurrentWord(record: CurrentWordRecord) {
        val payload = JSONObject()
            .put("slug", record.slug)
            .put("title", record.title)
            .put("devilDefinition", record.devilDefinition)
            .put("plainDefinition", record.plainDefinition)
            .put("warningLabel", record.warningLabel)
            .put("updatedAt", record.updatedAt)
            .put("source", record.source.name)
        preferences.edit().putString(CURRENT_WORD_KEY, payload.toString()).apply()
    }

    fun loadTheme(): SiteTheme {
        val name = preferences.getString(THEME_KEY, null) ?: return SiteTheme.book
        return runCatching { SiteTheme.valueOf(name) }.getOrDefault(SiteTheme.book)
    }

    fun loadThemeMode(): SiteThemeMode {
        val name = preferences.getString(THEME_MODE_KEY, null)
        if (name != null) {
            return runCatching { SiteThemeMode.valueOf(name) }.getOrDefault(SiteThemeMode.auto)
        }

        return if (preferences.contains(THEME_KEY)) SiteThemeMode.manual else SiteThemeMode.auto
    }

    fun saveTheme(theme: SiteTheme) {
        preferences.edit().putString(THEME_KEY, theme.name).apply()
    }

    fun saveThemeMode(mode: SiteThemeMode) {
        preferences.edit().putString(THEME_MODE_KEY, mode.name).apply()
    }

    fun loadDeveloperMode(): Boolean =
        preferences.getBoolean(DEVELOPER_MODE_KEY, false)

    fun saveDeveloperMode(enabled: Boolean) {
        preferences.edit().putBoolean(DEVELOPER_MODE_KEY, enabled).apply()
    }

    fun loadCatalogManifestCheckedAtMs(): Long? {
        if (!preferences.contains(CATALOG_MANIFEST_CHECKED_AT_MS_KEY)) {
            return null
        }

        return preferences.getLong(CATALOG_MANIFEST_CHECKED_AT_MS_KEY, 0L)
    }

    fun saveCatalogManifestCheckedAtMs(value: Long) {
        preferences.edit().putLong(CATALOG_MANIFEST_CHECKED_AT_MS_KEY, value).apply()
    }

    fun loadBundledCatalogVersion(): String? =
        preferences.getString(BUNDLED_CATALOG_VERSION_KEY, null)

    fun saveBundledCatalogVersion(value: String) {
        preferences.edit().putString(BUNDLED_CATALOG_VERSION_KEY, value).apply()
    }

    fun recordReviewForegroundActivation(nowMs: Long) {
        val dayKey = ReviewPromptPolicy.activeDayKey(nowMs)
        if (preferences.getString(REVIEW_LAST_ACTIVE_DAY_KEY, null) == dayKey) {
            return
        }

        val nextCount = preferences.getInt(REVIEW_ACTIVE_DAY_COUNT_KEY, 0) + 1
        preferences.edit()
            .putString(REVIEW_LAST_ACTIVE_DAY_KEY, dayKey)
            .putInt(REVIEW_ACTIVE_DAY_COUNT_KEY, nextCount)
            .apply()
    }

    fun incrementReviewEntryOpenCount(): Int {
        val nextCount = preferences.getInt(REVIEW_ENTRY_OPEN_COUNT_KEY, 0) + 1
        preferences.edit().putInt(REVIEW_ENTRY_OPEN_COUNT_KEY, nextCount).apply()
        return nextCount
    }

    fun loadReviewPromptState(entryOpenCount: Int = preferences.getInt(REVIEW_ENTRY_OPEN_COUNT_KEY, 0)): ReviewPromptState =
        ReviewPromptState(
            activeDayCount = preferences.getInt(REVIEW_ACTIVE_DAY_COUNT_KEY, 0),
            entryOpenCount = entryOpenCount,
            lastPromptAtMs = if (preferences.contains(REVIEW_LAST_PROMPT_AT_MS_KEY)) {
                preferences.getLong(REVIEW_LAST_PROMPT_AT_MS_KEY, 0L)
            } else {
                null
            },
            lastPromptedVersion = preferences.getString(REVIEW_LAST_PROMPTED_VERSION_KEY, null),
        )

    fun saveReviewLastPromptAtMs(value: Long) {
        preferences.edit().putLong(REVIEW_LAST_PROMPT_AT_MS_KEY, value).apply()
    }

    fun saveReviewLastPromptedVersion(value: String) {
        preferences.edit().putString(REVIEW_LAST_PROMPTED_VERSION_KEY, value).apply()
    }

    private companion object {
        const val BUNDLED_CATALOG_VERSION_KEY = "bundled-catalog-version"
        const val CATALOG_MANIFEST_CHECKED_AT_MS_KEY = "catalog-manifest-checked-at-ms"
        const val CURRENT_WORD_KEY = "current-word-record"
        const val SAVED_PLACE_KEY = "saved-reading-place"
        const val THEME_KEY = "site-theme"
        const val THEME_MODE_KEY = "site-theme-mode"
        const val DEVELOPER_MODE_KEY = "developer-mode"
        const val REVIEW_ACTIVE_DAY_COUNT_KEY = "review-active-day-count"
        const val REVIEW_ENTRY_OPEN_COUNT_KEY = "review-entry-open-count"
        const val REVIEW_LAST_ACTIVE_DAY_KEY = "review-last-active-day"
        const val REVIEW_LAST_PROMPT_AT_MS_KEY = "review-last-prompt-at-ms"
        const val REVIEW_LAST_PROMPTED_VERSION_KEY = "review-last-prompted-version"
    }
}

private fun resolveTheme(
    mode: SiteThemeMode,
    manualTheme: SiteTheme,
    systemDarkMode: Boolean,
): SiteTheme =
    if (mode == SiteThemeMode.auto) {
        if (systemDarkMode) SiteTheme.night else SiteTheme.book
    } else {
        manualTheme
    }

internal data class ReviewPromptState(
    val activeDayCount: Int,
    val entryOpenCount: Int,
    val lastPromptAtMs: Long?,
    val lastPromptedVersion: String?,
)

internal object ReviewPromptPolicy {
    private const val minimumActiveDays = 5
    private const val minimumEntryOpens = 12
    private const val promptCooldownMs = 180L * 24 * 60 * 60 * 1000

    fun shouldPrompt(state: ReviewPromptState, nowMs: Long, currentVersion: String): Boolean {
        if (state.activeDayCount < minimumActiveDays) {
            return false
        }

        if (state.entryOpenCount < minimumEntryOpens) {
            return false
        }

        if (state.lastPromptedVersion == currentVersion) {
            return false
        }

        if (state.lastPromptAtMs != null && nowMs - state.lastPromptAtMs < promptCooldownMs) {
            return false
        }

        return true
    }

    fun activeDayKey(nowMs: Long): String =
        SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
            timeZone = TimeZone.getDefault()
        }.format(Date(nowMs))
}

internal fun scoreSearchMatch(
    entry: Entry,
    tokens: List<String>,
): Int {
    val title = entry.title.lowercase(Locale.getDefault())
    val slug = entry.slug.lowercase(Locale.getDefault())
    val aliases = entry.aliases.map { alias -> alias.lowercase(Locale.getDefault()) }
    val categories = entry.categories.map { category -> category.lowercase(Locale.getDefault()) }
    val searchText = entry.searchText.lowercase(Locale.getDefault())

    val everyTokenMatches = tokens.all { token ->
        title.contains(token) ||
            slug.contains(token) ||
            aliases.any { alias -> alias.contains(token) } ||
            categories.any { category -> category.contains(token) } ||
            searchText.contains(token)
    }

    if (!everyTokenMatches) {
        return 0
    }

    return tokens.sumOf { token ->
        when {
            title == token || slug == token -> 140
            title.startsWith(token) || slug.startsWith(token) -> 90
            aliases.any { alias -> alias == token } -> 75
            aliases.any { alias -> alias.startsWith(token) } -> 55
            categories.any { category -> category.contains(token) } -> 35
            searchText.contains(token) -> 18
            else -> 0
        }
    }
}

internal fun resolveDeveloperModeEnabled(
    developerModeAvailable: Boolean,
    storedDeveloperMode: Boolean,
): Boolean = developerModeAvailable && storedDeveloperMode

internal fun slugFromDictionaryPath(path: String?): String? {
    val trimmed = path?.trim().orEmpty()
    if (!trimmed.startsWith("/dictionary/")) {
        return null
    }

    val slug = trimmed.removePrefix("/dictionary/").trim('/')
    return slug.takeIf { it.isNotBlank() && !it.contains('/') }
}

internal fun currentTimestamp(): String {
    val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US)
    formatter.timeZone = TimeZone.getTimeZone("UTC")
    return formatter.format(Date())
}

internal fun formatDisplayDate(raw: String): String {
    parseDate(raw)?.let { date ->
        return DateFormat.getDateInstance(DateFormat.MEDIUM).format(date)
    }

    return raw
}

internal fun formatDisplayDateTime(date: Date): String =
    DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT).format(date)

internal fun formatDisplayDateTime(timestampMs: Long): String =
    formatDisplayDateTime(Date(timestampMs))

private fun parseDate(raw: String): Date? {
    val candidates = listOf(
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US),
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.US),
        SimpleDateFormat("yyyy-MM-dd", Locale.US),
    )

    for (formatter in candidates) {
        formatter.timeZone = TimeZone.getTimeZone("UTC")
        try {
            return formatter.parse(raw)
        } catch (_: ParseException) {
            continue
        }
    }

    return null
}

private fun <T> List<T>.sortedByCaseInsensitive(selector: (T) -> String): List<T> =
    sortedBy { item -> selector(item).lowercase(Locale.getDefault()) }

private fun categoryAwareLetters(stats: List<LetterStat>): List<String> =
    stats.map(LetterStat::letter).sorted()

private fun normalizeLetter(value: String?): String? {
    val trimmed = value?.trim().orEmpty()
    if (trimmed.isEmpty()) {
        return null
    }

    return trimmed.take(1).uppercase(Locale.getDefault())
}

internal fun JSONObject.optStringOrNull(name: String): String? {
    if (isNull(name)) {
        return null
    }

    return optString(name).ifBlank { null }
}

private fun Entry.toCurrentWord(source: CurrentWordSource): CurrentWordRecord =
    CurrentWordRecord(
        slug = slug,
        title = title,
        devilDefinition = devilDefinition,
        plainDefinition = plainDefinition,
        warningLabel = warningLabel,
        updatedAt = currentTimestamp(),
        source = source,
    )

internal fun dictionarySlugFromLink(
    scheme: String?,
    host: String?,
    path: String?,
    directSlug: String? = null,
): String? {
    return when (scheme?.lowercase(Locale.US)) {
        "devilsaidictionary" -> {
            val normalizedHost = host?.lowercase(Locale.US)
            val candidate = if (normalizedHost == "dictionary") {
                directSlug
            } else {
                null
            }

            if (!candidate.isNullOrBlank()) {
                candidate
            } else {
                slugFromDictionaryPath(path)
            }
        }

        "https" -> {
            val normalizedHost = host?.lowercase(Locale.US) ?: return null
            if (normalizedHost !in supportedDictionaryHosts) {
                return null
            }

            slugFromDictionaryPath(path)
        }

        else -> null
    }
}

internal fun Uri.toDictionarySlug(): String? =
    dictionarySlugFromLink(
        scheme = scheme,
        host = host,
        path = path,
        directSlug = pathSegments.firstOrNull(),
    )

internal fun dictionaryEntryUrl(slug: String): String =
    "https://thedevilsaidictionary.com/dictionary/$slug"

internal fun dictionaryShareImageUrl(slug: String): String =
    "${dictionaryEntryUrl(slug)}/opengraph-image"

internal fun dictionaryShareImageFileName(slug: String): String {
    val safeSlug = slug
        .lowercase(Locale.US)
        .replace(Regex("[^a-z0-9._-]"), "-")
        .trim('-')
        .ifBlank { "entry" }

    return "devils-ai-dictionary-$safeSlug.png"
}

internal fun dictionaryShareSubject(title: String): String =
    "${title.trim()} | The Devil's AI Dictionary"

internal fun dictionaryShareText(
    title: String,
    slug: String,
    summary: String,
): String =
    buildString {
        append(title.trim())

        val normalizedSummary = summary.trim()
        if (normalizedSummary.isNotEmpty()) {
            append("\n")
            append(normalizedSummary)
        }

        append("\n\n")
        append(dictionaryEntryUrl(slug))
    }

internal fun sha256Hex(bytes: ByteArray): String =
    MessageDigest.getInstance("SHA-256")
        .digest(bytes)
        .joinToString(separator = "") { byte -> "%02x".format(byte) }

private fun String.toUrl() = java.net.URL(this)

private val supportedDictionaryHosts = setOf(
    "thedevilsaidictionary.com",
    "www.thedevilsaidictionary.com",
)

private const val dictionaryShareChooserTitle = "Share from The Devil's AI Dictionary"
