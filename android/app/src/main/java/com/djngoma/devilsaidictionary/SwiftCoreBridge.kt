package com.djngoma.devilsaidictionary

import org.json.JSONArray
import org.json.JSONObject
import java.io.Closeable

/**
 * JNI bridge to DevilsAIDictionaryCoreAndroidBridge (Swift).
 * All catalog decoding, filtering, daily word scheduling, and entry lookups
 * are delegated to the Swift core library.
 */
internal object SwiftCoreBridge {

    init {
        System.loadLibrary("DevilsAIDictionaryCoreAndroidBridge")
        System.loadLibrary("swift_bridge_jni")
    }

    fun decodeCatalog(bytes: ByteArray): CatalogHandle? {
        val handle = nativeCatalogDecode(bytes)
        if (handle == 0L) return null
        return CatalogHandle(handle)
    }

    private external fun nativeCatalogDecode(bytes: ByteArray): Long
    private external fun nativeCatalogFree(handle: Long)
    private external fun nativeCatalogEntryJson(handle: Long, slug: String): String?
    private external fun nativeCatalogFeaturedJson(handle: Long): String?
    private external fun nativeCatalogDailyWordJson(handle: Long, epochSeconds: Long): String?
    private external fun nativeCatalogDailyWordSlug(handle: Long, epochSeconds: Long): String?
    private external fun nativeCatalogRandomJson(handle: Long, excludingSlug: String?): String?
    private external fun nativeCatalogRecentJson(handle: Long, limit: Int): String?
    private external fun nativeCatalogMisunderstoodJson(handle: Long, limit: Int): String?
    private external fun nativeCatalogAllEntriesJson(handle: Long): String?
    private external fun nativeCatalogEntriesForSlugsJson(handle: Long, slugsJson: String): String?
    private external fun nativeCatalogFilterJson(handle: Long, filterJson: String): String?
    private external fun nativeCatalogMetadataJson(handle: Long): String?

    internal class CatalogHandle(private var handle: Long) : Closeable {

        val metadata: CatalogMetadata by lazy {
            val json = nativeCatalogMetadataJson(handle)
                ?: error("Failed to read catalog metadata from Swift core")
            parseCatalogMetadata(JSONObject(json))
        }

        val allEntries: List<Entry> by lazy {
            val json = nativeCatalogAllEntriesJson(handle) ?: return@lazy emptyList()
            parseEntryList(JSONArray(json))
        }

        fun entry(slug: String): Entry? {
            val json = nativeCatalogEntryJson(handle, slug) ?: return null
            return parseEntry(JSONObject(json))
        }

        fun featuredEntry(): Entry? {
            val json = nativeCatalogFeaturedJson(handle) ?: return null
            return parseEntry(JSONObject(json))
        }

        fun dailyWord(): Entry? {
            val epochSeconds = System.currentTimeMillis() / 1000
            val json = nativeCatalogDailyWordJson(handle, epochSeconds) ?: return null
            return parseEntry(JSONObject(json))
        }

        fun dailyWordAt(epochSeconds: Long): Entry? {
            val json = nativeCatalogDailyWordJson(handle, epochSeconds) ?: return null
            return parseEntry(JSONObject(json))
        }

        fun dailyWordSlug(): String? {
            val epochSeconds = System.currentTimeMillis() / 1000
            return nativeCatalogDailyWordSlug(handle, epochSeconds)
        }

        fun dailyWordSlugAt(epochSeconds: Long): String? =
            nativeCatalogDailyWordSlug(handle, epochSeconds)

        fun randomEntry(excluding: String? = null): Entry? {
            val json = nativeCatalogRandomJson(handle, excluding) ?: return null
            return parseEntry(JSONObject(json))
        }

        fun recentEntries(limit: Int = 4): List<Entry> {
            val json = nativeCatalogRecentJson(handle, limit) ?: return emptyList()
            return parseEntryList(JSONArray(json))
        }

        fun misunderstoodEntries(limit: Int = 4): List<Entry> {
            val json = nativeCatalogMisunderstoodJson(handle, limit) ?: return emptyList()
            return parseEntryList(JSONArray(json))
        }

        fun entriesFor(slugs: List<String>): List<Entry> {
            if (slugs.isEmpty()) return emptyList()
            val slugsJson = JSONArray(slugs).toString()
            val json = nativeCatalogEntriesForSlugsJson(handle, slugsJson) ?: return emptyList()
            return parseEntryList(JSONArray(json))
        }

        fun filteredEntries(
            categorySlug: String? = null,
            difficulty: Difficulty? = null,
            technicalDepth: TechnicalDepth? = null,
            vendorFilter: VendorFilter = VendorFilter.all,
            letter: String? = null,
        ): List<Entry> {
            val filter = JSONObject().apply {
                put("categorySlug", categorySlug)
                put("difficulty", difficulty?.name)
                put("technicalDepth", technicalDepth?.name)
                put("vendorFilter", vendorFilter.name)
                put("letter", letter)
            }
            val json = nativeCatalogFilterJson(handle, filter.toString()) ?: return emptyList()
            return parseEntryList(JSONArray(json))
        }

        override fun close() {
            if (handle != 0L) {
                nativeCatalogFree(handle)
                handle = 0L
            }
        }

        protected fun finalize() {
            close()
        }
    }
}

internal data class CatalogMetadata(
    val letterStats: List<LetterStat>,
    val categoryStats: List<CategoryStat>,
    val featuredSlug: String,
    val latestPublishedAt: String,
    val editorialTimeZone: String,
    val dailyWordStartDate: String,
    val entryCount: Int,
    val recentSlugs: List<String>,
    val misunderstoodSlugs: List<String>,
)

private fun parseCatalogMetadata(json: JSONObject): CatalogMetadata =
    CatalogMetadata(
        letterStats = parseLetterStats(json.getJSONArray("letterStats")),
        categoryStats = parseCategoryStats(json.getJSONArray("categoryStats")),
        featuredSlug = json.getString("featuredSlug"),
        latestPublishedAt = json.getString("latestPublishedAt"),
        editorialTimeZone = json.getString("editorialTimeZone"),
        dailyWordStartDate = json.getString("dailyWordStartDate"),
        entryCount = json.getInt("entryCount"),
        recentSlugs = jsonArrayToStringList(json.getJSONArray("recentSlugs")),
        misunderstoodSlugs = jsonArrayToStringList(json.getJSONArray("misunderstoodSlugs")),
    )

private fun parseEntryList(array: JSONArray): List<Entry> =
    (0 until array.length()).map { parseEntry(array.getJSONObject(it)) }

private fun parseEntry(json: JSONObject): Entry =
    Entry(
        title = json.getString("title"),
        slug = json.getString("slug"),
        letter = json.getString("letter"),
        categories = jsonArrayToStringList(json.getJSONArray("categories")),
        aliases = jsonArrayToStringList(json.getJSONArray("aliases")),
        devilDefinition = json.getString("devilDefinition"),
        plainDefinition = json.getString("plainDefinition"),
        whyExists = json.getString("whyExists"),
        misuse = json.getString("misuse"),
        practicalMeaning = json.getString("practicalMeaning"),
        example = json.getString("example"),
        askNext = jsonArrayToStringList(json.getJSONArray("askNext")),
        related = jsonArrayToStringList(json.getJSONArray("related")),
        seeAlso = jsonArrayToStringList(json.getJSONArray("seeAlso")),
        difficulty = Difficulty.valueOf(json.getString("difficulty")),
        technicalDepth = TechnicalDepth.valueOf(json.getString("technicalDepth")),
        hypeLevel = HypeLevel.valueOf(json.getString("hypeLevel")),
        isVendorTerm = json.getBoolean("isVendorTerm"),
        publishedAt = json.getString("publishedAt"),
        updatedAt = json.getString("updatedAt"),
        warningLabel = json.optStringOrNull("warningLabel"),
        vendorReferences = jsonArrayToStringList(json.getJSONArray("vendorReferences")),
        note = json.optStringOrNull("note"),
        tags = jsonArrayToStringList(json.getJSONArray("tags")),
        misunderstoodScore = json.getInt("misunderstoodScore"),
        translations = parseTranslations(json.getJSONArray("translations")),
        diagram = json.optStringOrNull("diagram"),
        body = json.getString("body"),
        categorySlugs = jsonArrayToStringList(json.getJSONArray("categorySlugs")),
        url = json.getString("url"),
        searchText = json.optString("searchText", ""),
        relatedSlugs = jsonArrayToStringList(json.getJSONArray("relatedSlugs")),
        resolvedSeeAlso = parseEntryReferences(json.optJSONArray("resolvedSeeAlso")),
        resolvedVendorReferences = parseEntryReferences(json.optJSONArray("resolvedVendorReferences")),
    )

private fun parseEntryReferences(array: JSONArray?): List<EntryReference> {
    if (array == null) {
        return emptyList()
    }

    return (0 until array.length()).map {
        val json = array.getJSONObject(it)
        EntryReference(
            label = json.getString("label"),
            entrySlug = json.optStringOrNull("entrySlug"),
        )
    }
}

private fun parseTranslations(array: JSONArray): List<Translation> =
    (0 until array.length()).map {
        val json = array.getJSONObject(it)
        Translation(label = json.getString("label"), text = json.getString("text"))
    }

private fun parseLetterStats(array: JSONArray): List<LetterStat> =
    (0 until array.length()).map {
        val json = array.getJSONObject(it)
        LetterStat(
            letter = json.getString("letter"),
            count = json.getInt("count"),
            href = json.getString("href"),
        )
    }

private fun parseCategoryStats(array: JSONArray): List<CategoryStat> =
    (0 until array.length()).map {
        val json = array.getJSONObject(it)
        CategoryStat(
            title = json.getString("title"),
            description = json.getString("description"),
            slug = json.getString("slug"),
            count = json.getInt("count"),
            sampleTerms = jsonArrayToStringList(json.getJSONArray("sampleTerms")),
        )
    }

private fun jsonArrayToStringList(array: JSONArray): List<String> =
    (0 until array.length()).map { array.getString(it) }
