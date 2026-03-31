package com.djngoma.devilsaidictionary

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest
import java.text.DateFormat
import java.text.ParseException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlin.random.Random

enum class NativeTab {
    Home,
    Browse,
    Search,
    Saved,
}

enum class SiteTheme(val label: String, val isDark: Boolean) {
    book("Book", false),
    codex("Codex", false),
    absolutely("Absolutely", false),
    night("Night", true),
}

sealed interface NativeOverlay {
    data object About : NativeOverlay
    data object Book : NativeOverlay
    data object Guide : NativeOverlay
    data class EntryDetail(val slug: String) : NativeOverlay
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

enum class VendorFilter {
    all,
    vendorOnly,
    nonVendorOnly,
}

enum class CurrentWordSource {
    seeded,
    manualRefresh,
    deepLink,
}

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
    val isVendorTerm: Boolean,
    val publishedAt: String,
    val updatedAt: String,
    val warningLabel: String?,
    val vendorReferences: List<String>,
    val note: String?,
    val translations: List<Translation>,
    val diagram: String?,
    val body: String,
    val categorySlugs: List<String>,
    val searchText: String,
    val relatedSlugs: List<String>,
)

data class LetterStat(
    val letter: String,
    val count: Int,
)

data class CategoryStat(
    val title: String,
    val description: String,
    val slug: String,
    val count: Int,
)

data class EntrySection(
    val title: String,
    val entries: List<Entry>,
)

internal data class BackNavigationTransition(
    val selectedTab: NativeTab,
    val activeOverlay: NativeOverlay?,
)

internal data class DeepLinkTransition(
    val selectedTab: NativeTab,
    val activeOverlay: NativeOverlay.EntryDetail,
    val currentWord: CurrentWordRecord,
)

data class DictionaryCatalog(
    val entries: List<Entry>,
    val recentSlugs: List<String>,
    val misunderstoodSlugs: List<String>,
    val letterStats: List<LetterStat>,
    val categoryStats: List<CategoryStat>,
    val featuredSlug: String,
    val latestPublishedAt: String,
) {
    private val entriesBySlug = entries.associateBy(Entry::slug)

    fun entry(slug: String): Entry? = entriesBySlug[slug]

    fun entriesFor(slugs: List<String>): List<Entry> = slugs.mapNotNull(entriesBySlug::get)

    fun featuredEntry(): Entry? = entry(featuredSlug)

    fun recentEntries(limit: Int = 4): List<Entry> = entriesFor(recentSlugs.take(limit))

    fun misunderstoodEntries(limit: Int = 4): List<Entry> =
        entriesFor(misunderstoodSlugs.take(limit))

    fun randomEntry(excluding: String? = null): Entry? {
        val candidates = entries.filter { candidate ->
            excluding == null || candidate.slug != excluding
        }

        if (candidates.isEmpty()) {
            return null
        }

        return candidates[Random.nextInt(candidates.size)]
    }
}

class NativeDictionaryStore(
    context: Context,
) {
    private val appContext = context.applicationContext
    private val storage = NativeDictionaryStorage(
        appContext.getSharedPreferences("native-dictionary-store", Context.MODE_PRIVATE),
    )

    private var catalog: DictionaryCatalog? = null

    var selectedTab by mutableStateOf(NativeTab.Home)
        private set

    var activeOverlay by mutableStateOf<NativeOverlay?>(null)
        private set

    var browseLetter by mutableStateOf<String?>(null)
    var browseCategorySlug by mutableStateOf<String?>(null)
    var searchQuery by mutableStateOf("")
    var searchCategorySlug by mutableStateOf<String?>(null)
    var searchDifficulty by mutableStateOf<Difficulty?>(null)
    var searchTechnicalDepth by mutableStateOf<TechnicalDepth?>(null)
    var searchVendorFilter by mutableStateOf(VendorFilter.all)

    var siteTheme by mutableStateOf(storage.loadTheme())
        private set

    var currentWord by mutableStateOf<CurrentWordRecord?>(null)
        private set

    var catalogVersion by mutableStateOf<String?>(null)
        private set

    var savedPlace by mutableStateOf<BookmarkRecord?>(null)
        private set

    var loadError by mutableStateOf<String?>(null)
        private set

    init {
        savedPlace = storage.loadSavedPlace()
        loadCatalog()
        seedCurrentWordIfNeeded()
    }

    val entries: List<Entry>
        get() = catalog?.entries ?: emptyList()

    val featuredEntry: Entry?
        get() = catalog?.featuredEntry()

    val recentEntries: List<Entry>
        get() = catalog?.recentEntries() ?: emptyList()

    val latestPublishedAt: String?
        get() = catalog?.latestPublishedAt

    val misunderstoodEntries: List<Entry>
        get() = catalog?.misunderstoodEntries() ?: emptyList()

    val categoryStats: List<CategoryStat>
        get() = catalog?.categoryStats ?: emptyList()

    val letterOptions: List<String>
        get() = categoryAwareLetters(catalog?.letterStats ?: emptyList())

    val hasSearchFilters: Boolean
        get() = searchCategorySlug != null ||
            searchDifficulty != null ||
            searchTechnicalDepth != null ||
            searchVendorFilter != VendorFilter.all

    val browseSections: List<EntrySection>
        get() {
            val filtered = entries
                .filterBy(
                    categorySlug = browseCategorySlug,
                    difficulty = null,
                    technicalDepth = null,
                    vendorFilter = VendorFilter.all,
                    letter = browseLetter,
                )
                .sortedByCaseInsensitive(Entry::title)
            val grouped = filtered.groupBy(Entry::letter)
            return grouped.keys.sorted().map { letter ->
                EntrySection(
                    title = letter,
                    entries = grouped[letter].orEmpty(),
                )
            }
        }

    val searchResults: List<Entry>
        get() {
            val filtered = entries
                .filterBy(
                    categorySlug = searchCategorySlug,
                    difficulty = searchDifficulty,
                    technicalDepth = searchTechnicalDepth,
                    vendorFilter = searchVendorFilter,
                    letter = null,
                )
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

    fun setTheme(theme: SiteTheme) {
        siteTheme = theme
        storage.saveTheme(theme)
    }

    fun presentEntry(slug: String) {
        if (entry(slug) != null) {
            activeOverlay = NativeOverlay.EntryDetail(slug)
        }
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

    fun presentAbout() {
        activeOverlay = NativeOverlay.About
    }

    fun dismissOverlay() {
        activeOverlay = null
    }

    fun showBrowse(letter: String?) {
        browseLetter = normalizeLetter(letter)
        selectedTab = NativeTab.Browse
    }

    fun showBrowseCategory(slug: String?) {
        browseCategorySlug = slug
        selectedTab = NativeTab.Browse
    }

    fun showCategoryInSearch(slug: String?) {
        searchCategorySlug = slug
        selectedTab = NativeTab.Search
    }

    fun resetSearchFilters() {
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
            selectedTab = NativeTab.Browse
            return
        }

        when (bookmark.href) {
            "/book" -> presentBook()
            "/about" -> presentAbout()
            "/how-to-read" -> presentGuide()
            else -> {
                val slug = slugFromDictionaryPath(bookmark.href)
                if (slug == null) {
                    selectedTab = NativeTab.Browse
                } else {
                    presentEntry(slug)
                }
            }
        }
    }

    fun openCurrentWord() {
        currentWord?.slug?.let(::presentEntry)
    }

    fun openRandomEntry() {
        catalog?.randomEntry(excluding = currentWord?.slug)?.let(::presentEntry)
    }

    fun refreshCurrentWord() {
        val nextWord = catalog?.randomEntry(excluding = currentWord?.slug)
            ?.toCurrentWord(CurrentWordSource.manualRefresh)
            ?: return
        persistCurrentWord(nextWord)
    }

    fun handleIntent(intent: Intent?) {
        val slug = intent?.data?.toDictionarySlug() ?: return
        val entry = entry(slug) ?: return

        val transition = buildDeepLinkTransition(entry)
        persistCurrentWord(transition.currentWord)
        selectedTab = transition.selectedTab
        activeOverlay = transition.activeOverlay
    }

    fun handleBack(): Boolean {
        val transition = reduceBackNavigation(
            selectedTab = selectedTab,
            activeOverlay = activeOverlay,
        ) ?: return false

        selectedTab = transition.selectedTab
        activeOverlay = transition.activeOverlay
        return true
    }

    private fun loadCatalog() {
        runCatching {
            val bytes = appContext.assets.open("entries.generated.json").use { input ->
                input.readBytes()
            }
            catalog = parseCatalog(JSONObject(String(bytes, Charsets.UTF_8)))
            catalogVersion = sha256Hex(bytes)
            loadError = null
        }.onFailure { error ->
            catalog = null
            catalogVersion = null
            loadError = error.message ?: "The bundled Android catalog could not be loaded."
        }
    }

    private fun seedCurrentWordIfNeeded() {
        val persisted = storage.loadCurrentWord()
        if (persisted != null && entry(persisted.slug) != null) {
            currentWord = persisted
            return
        }

        val seeded = catalog?.randomEntry()?.toCurrentWord(CurrentWordSource.seeded)
        if (seeded != null) {
            persistCurrentWord(seeded)
        }
    }

    private fun persistSavedPlace(record: BookmarkRecord) {
        storage.saveSavedPlace(record)
        savedPlace = record
    }

    private fun persistCurrentWord(record: CurrentWordRecord) {
        storage.saveCurrentWord(record)
        currentWord = record
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

    fun saveTheme(theme: SiteTheme) {
        preferences.edit().putString(THEME_KEY, theme.name).apply()
    }

    private companion object {
        const val CURRENT_WORD_KEY = "current-word-record"
        const val SAVED_PLACE_KEY = "saved-reading-place"
        const val THEME_KEY = "site-theme"
    }
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

internal fun slugFromDictionaryPath(path: String?): String? {
    val trimmed = path?.trim().orEmpty()
    if (!trimmed.startsWith("/dictionary/")) {
        return null
    }

    val slug = trimmed.removePrefix("/dictionary/")
    return slug.ifBlank { null }
}

internal fun currentTimestamp(): String {
    val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US)
    formatter.timeZone = TimeZone.getTimeZone("UTC")
    return formatter.format(Date())
}

internal fun reduceBackNavigation(
    selectedTab: NativeTab,
    activeOverlay: NativeOverlay?,
): BackNavigationTransition? {
    if (activeOverlay != null) {
        return BackNavigationTransition(
            selectedTab = selectedTab,
            activeOverlay = null,
        )
    }

    if (selectedTab != NativeTab.Home) {
        return BackNavigationTransition(
            selectedTab = NativeTab.Home,
            activeOverlay = null,
        )
    }

    return null
}

internal fun buildDeepLinkTransition(entry: Entry): DeepLinkTransition =
    DeepLinkTransition(
        selectedTab = NativeTab.Browse,
        activeOverlay = NativeOverlay.EntryDetail(entry.slug),
        currentWord = entry.toCurrentWord(CurrentWordSource.deepLink),
    )

internal fun formatDisplayDate(raw: String): String {
    parseDate(raw)?.let { date ->
        return DateFormat.getDateInstance(DateFormat.MEDIUM).format(date)
    }

    return raw
}

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

private fun List<Entry>.filterBy(
    categorySlug: String?,
    difficulty: Difficulty?,
    technicalDepth: TechnicalDepth?,
    vendorFilter: VendorFilter,
    letter: String?,
): List<Entry> {
    val normalizedLetter = normalizeLetter(letter)

    return filter { entry ->
        if (categorySlug != null && !entry.categorySlugs.contains(categorySlug)) {
            return@filter false
        }

        if (difficulty != null && entry.difficulty != difficulty) {
            return@filter false
        }

        if (technicalDepth != null && entry.technicalDepth != technicalDepth) {
            return@filter false
        }

        when (vendorFilter) {
            VendorFilter.all -> Unit
            VendorFilter.vendorOnly -> {
                if (!entry.isVendorTerm) {
                    return@filter false
                }
            }

            VendorFilter.nonVendorOnly -> {
                if (entry.isVendorTerm) {
                    return@filter false
                }
            }
        }

        if (normalizedLetter != null && entry.letter != normalizedLetter) {
            return@filter false
        }

        true
    }
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

internal fun parseCatalog(root: JSONObject): DictionaryCatalog =
    DictionaryCatalog(
        entries = root.getJSONArray("entries").toEntryList(),
        recentSlugs = root.getJSONArray("recentSlugs").toStringList(),
        misunderstoodSlugs = root.getJSONArray("misunderstoodSlugs").toStringList(),
        letterStats = root.getJSONArray("letterStats").toLetterStats(),
        categoryStats = root.getJSONArray("categoryStats").toCategoryStats(),
        featuredSlug = root.getString("featuredSlug"),
        latestPublishedAt = root.getString("latestPublishedAt"),
    )

private fun JSONArray.toEntryList(): List<Entry> =
    (0 until length()).map { index ->
        val json = getJSONObject(index)
        Entry(
            title = json.getString("title"),
            slug = json.getString("slug"),
            letter = json.getString("letter"),
            categories = json.getJSONArray("categories").toStringList(),
            aliases = json.getJSONArray("aliases").toStringList(),
            devilDefinition = json.getString("devilDefinition"),
            plainDefinition = json.getString("plainDefinition"),
            whyExists = json.getString("whyExists"),
            misuse = json.getString("misuse"),
            practicalMeaning = json.getString("practicalMeaning"),
            example = json.getString("example"),
            askNext = json.getJSONArray("askNext").toStringList(),
            related = json.getJSONArray("related").toStringList(),
            seeAlso = json.getJSONArray("seeAlso").toStringList(),
            difficulty = Difficulty.valueOf(json.getString("difficulty")),
            technicalDepth = TechnicalDepth.valueOf(json.getString("technicalDepth")),
            isVendorTerm = json.getBoolean("isVendorTerm"),
            publishedAt = json.getString("publishedAt"),
            updatedAt = json.getString("updatedAt"),
            warningLabel = json.optStringOrNull("warningLabel"),
            vendorReferences = json.getJSONArray("vendorReferences").toStringList(),
            note = json.optStringOrNull("note"),
            translations = json.getJSONArray("translations").toTranslations(),
            diagram = json.optStringOrNull("diagram"),
            body = json.getString("body"),
            categorySlugs = json.getJSONArray("categorySlugs").toStringList(),
            searchText = json.getString("searchText"),
            relatedSlugs = json.getJSONArray("relatedSlugs").toStringList(),
        )
    }

private fun JSONArray.toTranslations(): List<Translation> =
    (0 until length()).map { index ->
        val json = getJSONObject(index)
        Translation(
            label = json.getString("label"),
            text = json.getString("text"),
        )
    }

private fun JSONArray.toLetterStats(): List<LetterStat> =
    (0 until length()).map { index ->
        val json = getJSONObject(index)
        LetterStat(
            letter = json.getString("letter"),
            count = json.getInt("count"),
        )
    }

private fun JSONArray.toCategoryStats(): List<CategoryStat> =
    (0 until length()).map { index ->
        val json = getJSONObject(index)
        CategoryStat(
            title = json.getString("title"),
            description = json.getString("description"),
            slug = json.getString("slug"),
            count = json.getInt("count"),
        )
    }

private fun JSONArray.toStringList(): List<String> =
    (0 until length()).map { index -> getString(index) }

private fun JSONObject.optStringOrNull(name: String): String? {
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

private fun Uri.toDictionarySlug(): String? {
    if (scheme != "devilsaidictionary") {
        return null
    }

    val direct = if (host == "dictionary") {
        pathSegments.firstOrNull()
    } else {
        null
    }

    if (!direct.isNullOrBlank()) {
        return direct
    }

    return slugFromDictionaryPath(path)
}

private fun sha256Hex(bytes: ByteArray): String =
    MessageDigest.getInstance("SHA-256")
        .digest(bytes)
        .joinToString(separator = "") { byte -> "%02x".format(byte) }
