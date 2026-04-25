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
    val compatibility: CatalogCompatibility = CatalogCompatibility(),
)

internal data class CatalogCompatibility(
    val minimumAppVersion: String? = null,
    val minimumAppleBuildNumber: Int? = null,
    val minimumAndroidVersionCode: Int? = null,
    val updateStatus: String = "none",
    val upgradeMessage: String? = null,
)

internal fun CatalogCompatibility.requiresAndroidUpdate(currentVersionCode: Int): Boolean {
    if (updateStatus != "required") {
        return false
    }

    val minimum = minimumAndroidVersionCode ?: return true
    return currentVersionCode < minimum
}

internal val CatalogCompatibility.appUpdateMessage: String
    get() = upgradeMessage ?: "This catalogue needs a newer version of the app."

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
        compatibility = parseCatalogCompatibility(root.optJSONObject("compatibility")),
    )

internal fun parseCatalogCompatibility(root: JSONObject?): CatalogCompatibility {
    if (root == null) {
        return CatalogCompatibility()
    }

    return CatalogCompatibility(
        minimumAppVersion = root.optStringOrNull("minimumAppVersion"),
        minimumAppleBuildNumber = root.optIntOrNull("minimumAppleBuildNumber"),
        minimumAndroidVersionCode = root.optIntOrNull("minimumAndroidVersionCode"),
        updateStatus = root.optString("updateStatus").ifBlank { "none" },
        upgradeMessage = root.optStringOrNull("upgradeMessage"),
    )
}

internal fun parseCatalogSnapshot(bytes: ByteArray): CatalogSnapshot {
    val handle = SwiftCoreBridge.decodeCatalog(bytes)
        ?: error("Swift core failed to decode the catalog JSON")
    val catalog = DictionaryCatalog(handle)

    val root = JSONObject(String(bytes, Charsets.UTF_8))
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

private fun JSONObject.optIntOrNull(name: String): Int? {
    if (!has(name) || isNull(name)) {
        return null
    }

    return optInt(name)
}
