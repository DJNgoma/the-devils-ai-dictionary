package com.djngoma.devilsaidictionary

import org.json.JSONObject

internal const val supportedCatalogSchemaVersion = 1
internal const val catalogManifestStaleAfterMs = 6L * 60L * 60L * 1000L

internal data class CatalogManifest(
    val schemaVersion: Int,
    val catalogVersion: String,
    val entryCount: Int,
    val latestPublishedAt: String,
    val publishedAt: String?,
    val snapshotPath: String,
    val sha256: String,
    val bytes: Long?,
)

internal data class CatalogSnapshot(
    val schemaVersion: Int,
    val catalogVersion: String,
    val entryCount: Int,
    val catalog: DictionaryCatalog,
)

internal fun parseCatalogManifest(root: JSONObject): CatalogManifest =
    CatalogManifest(
        schemaVersion = root.optInt("schemaVersion").takeIf { it > 0 } ?: supportedCatalogSchemaVersion,
        catalogVersion = root.getString("catalogVersion"),
        entryCount = root.optInt("entryCount").takeIf { it > 0 } ?: 0,
        latestPublishedAt = root.getString("latestPublishedAt"),
        publishedAt = root.optStringOrNull("publishedAt"),
        snapshotPath = root.getString("snapshotPath"),
        sha256 = root.getString("sha256"),
        bytes = root.optLongOrNull("bytes"),
    )

internal fun parseCatalogSnapshot(bytes: ByteArray): CatalogSnapshot {
    val root = JSONObject(String(bytes, Charsets.UTF_8))
    val catalog = parseCatalog(root)
    val entryCount =
        root.optInt("entryCount")
            .takeIf { it > 0 }
            ?: catalog.entries.size

    return CatalogSnapshot(
        schemaVersion = root.optInt("schemaVersion").takeIf { it > 0 } ?: supportedCatalogSchemaVersion,
        catalogVersion = root.optString("catalogVersion").ifBlank { sha256Hex(bytes) },
        entryCount = entryCount,
        catalog = catalog,
    )
}

internal fun shouldRefreshCatalogManifest(
    lastCheckedAtMs: Long?,
    nowMs: Long,
    staleAfterMs: Long = catalogManifestStaleAfterMs,
): Boolean {
    if (lastCheckedAtMs == null) {
        return true
    }

    return nowMs - lastCheckedAtMs >= staleAfterMs
}

internal fun supportsCatalogSchema(schemaVersion: Int): Boolean =
    schemaVersion in 1..supportedCatalogSchemaVersion

internal fun shouldReplaceCachedCatalogWithBundle(
    cachedVersion: String,
    bundleVersion: String,
    lastBundledVersion: String?,
): Boolean =
    lastBundledVersion != null &&
        lastBundledVersion != bundleVersion &&
        cachedVersion == lastBundledVersion

private fun JSONObject.optLongOrNull(name: String): Long? {
    if (!has(name) || isNull(name)) {
        return null
    }

    return optLong(name)
}
