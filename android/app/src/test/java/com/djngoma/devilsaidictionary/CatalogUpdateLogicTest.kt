package com.djngoma.devilsaidictionary

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.net.URL

class CatalogUpdateLogicTest {
    // parseCatalogSnapshot now delegates to Swift via JNI and cannot run in JVM unit tests.
    // Catalog decoding is covered by the Swift-side DevilsAIDictionaryCoreTests instead.

    @Test
    fun `parseCatalogManifest keeps snapshot metadata`() {
        val manifest =
            parseCatalogManifest(
                JSONObject(
                    """
                    {
                      "schemaVersion": 1,
                      "catalogVersion": "catalog-v2",
                      "entryCount": 86,
                      "latestPublishedAt": "2026-03-28",
                      "publishedAt": "2026-04-02T12:33:29.892Z",
                      "snapshotPath": "/mobile-catalog/entries.catalog-v2.json",
                      "sha256": "abc123",
                      "bytes": 424478,
                      "compatibility": {
                        "minimumAndroidVersionCode": 28,
                        "updateStatus": "required",
                        "upgradeMessage": "Please update the app."
                      }
                    }
                    """.trimIndent(),
                ),
            )

        assertEquals("catalog-v2", manifest.catalogVersion)
        assertEquals("/mobile-catalog/entries.catalog-v2.json", manifest.snapshotPath)
        assertEquals(424478L, manifest.bytes)
        assertEquals(28, manifest.compatibility.minimumAndroidVersionCode)
        assertEquals("required", manifest.compatibility.updateStatus)
        assertEquals("Please update the app.", manifest.compatibility.appUpdateMessage)
        assertTrue(manifest.compatibility.requiresAndroidUpdate(27))
        assertFalse(manifest.compatibility.requiresAndroidUpdate(28))
    }

    @Test
    fun `shouldRefreshCatalogManifest respects staleness window`() {
        assertTrue(shouldRefreshCatalogManifest(lastCheckedAtMs = null, nowMs = 100L))
        assertFalse(
            shouldRefreshCatalogManifest(
                lastCheckedAtMs = 1_000L,
                nowMs = 1_000L + catalogManifestStaleAfterMs - 1L,
            ),
        )
        assertTrue(
            shouldRefreshCatalogManifest(
                lastCheckedAtMs = 1_000L,
                nowMs = 1_000L + catalogManifestStaleAfterMs,
            ),
        )
    }

    @Test
    fun `resolveCatalogUrl handles relative snapshot paths`() {
        val manifestUrl = URL("https://thedevilsaidictionary.com/mobile-catalog/manifest.json")

        assertEquals(
            "https://thedevilsaidictionary.com/mobile-catalog/entries.catalog-v2.json",
            resolveCatalogUrl(manifestUrl, "entries.catalog-v2.json").toString(),
        )
        assertEquals(
            "https://thedevilsaidictionary.com/mobile-catalog/entries.catalog-v2.json",
            resolveCatalogUrl(manifestUrl, "/mobile-catalog/entries.catalog-v2.json").toString(),
        )
    }

    @Test
    fun `shouldReplaceCachedCatalogWithBundle only upgrades seeded cache`() {
        assertTrue(
            shouldReplaceCachedCatalogWithBundle(
                cachedVersion = "bundle-v1",
                bundleVersion = "bundle-v2",
                lastBundledVersion = "bundle-v1",
            ),
        )
        assertFalse(
            shouldReplaceCachedCatalogWithBundle(
                cachedVersion = "ota-v3",
                bundleVersion = "bundle-v2",
                lastBundledVersion = "bundle-v1",
            ),
        )
        assertFalse(
            shouldReplaceCachedCatalogWithBundle(
                cachedVersion = "bundle-v1",
                bundleVersion = "bundle-v1",
                lastBundledVersion = "bundle-v1",
            ),
        )
        assertFalse(
            shouldReplaceCachedCatalogWithBundle(
                cachedVersion = "bundle-v1",
                bundleVersion = "bundle-v2",
                lastBundledVersion = null,
            ),
        )
    }

    @Test
    fun `catalogRefreshFailureMessage keeps refresh failures user readable`() {
        assertEquals(
            "The catalogue clerk cannot reach production. The internet appears to have left the building with the new terminology.",
            catalogRefreshFailureMessage("Unable to resolve host thedevilsaidictionary.com"),
        )
        assertEquals(
            "Production took too long to answer. The new jargon may be stuck in committee; try again.",
            catalogRefreshFailureMessage("Read timed out"),
        )
        assertEquals(
            "The catalogue clerk came back empty-handed: hash mismatch",
            catalogRefreshFailureMessage("hash mismatch"),
        )
    }

    @Test
    fun `catalogRefreshSuccessMessage calls out unchanged repeat refreshes`() {
        assertEquals(
            "Dictionary is up to date. The catalogue clerk found nothing new to overexplain.",
            catalogRefreshSuccessMessage(didUpdate = false, unchangedRefreshesWithinWindow = 1),
        )
        assertEquals(
            "Still up to date. Pulling again will not make the buzzwords ripen faster.",
            catalogRefreshSuccessMessage(didUpdate = false, unchangedRefreshesWithinWindow = 3),
        )
        assertEquals(
            "Dictionary updated. The catalogue clerk found fresh terminology and filed it under necessary mischief.",
            catalogRefreshSuccessMessage(didUpdate = true, unchangedRefreshesWithinWindow = 0),
        )
    }
}
