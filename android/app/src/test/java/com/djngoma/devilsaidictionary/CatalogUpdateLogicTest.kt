package com.djngoma.devilsaidictionary

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.net.URL

class CatalogUpdateLogicTest {
    @Test
    fun `parseCatalogSnapshot uses embedded version metadata`() {
        val snapshot =
            parseCatalogSnapshot(
                """
                {
                  "schemaVersion": 1,
                  "catalogVersion": "catalog-v2",
                  "entryCount": 1,
                  "entries": [
                    {
                      "title": "Agent",
                      "slug": "agent",
                      "letter": "A",
                      "categories": ["Agents and workflows"],
                      "aliases": ["AI agent"],
                      "devilDefinition": "A workflow with delusions of grandeur.",
                      "plainDefinition": "A multi-step system that can act with tools.",
                      "whyExists": "Some tasks take more than one turn.",
                      "misuse": "People use it for any chatbot with a button.",
                      "practicalMeaning": "Permissions, orchestration, state, and guardrails.",
                      "example": "The support agent drafted a response and asked for approval.",
                      "askNext": ["What tools can it use?"],
                      "related": ["orchestration"],
                      "seeAlso": ["workflow"],
                      "difficulty": "beginner",
                      "technicalDepth": "medium",
                      "isVendorTerm": false,
                      "publishedAt": "2026-03-15",
                      "updatedAt": "2026-03-20",
                      "warningLabel": null,
                      "vendorReferences": [],
                      "note": null,
                      "translations": [],
                      "diagram": null,
                      "body": "",
                      "categorySlugs": ["agents-and-workflows"],
                      "searchText": "agent ai workflow orchestration planning tools",
                      "relatedSlugs": ["orchestration"]
                    }
                  ],
                  "recentSlugs": ["agent"],
                  "misunderstoodSlugs": ["agent"],
                  "letterStats": [{"letter": "A", "count": 1}],
                  "categoryStats": [
                    {
                      "title": "Agents and workflows",
                      "description": "Workflow systems with tools.",
                      "slug": "agents-and-workflows",
                      "count": 1
                    }
                  ],
                  "featuredSlug": "agent",
                  "latestPublishedAt": "2026-03-15"
                }
                """.trimIndent().toByteArray(),
            )

        assertEquals(1, snapshot.schemaVersion)
        assertEquals("catalog-v2", snapshot.catalogVersion)
        assertEquals(1, snapshot.entryCount)
        assertEquals("2026-03-15", snapshot.catalog.latestPublishedAt)
    }

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
                      "bytes": 424478
                    }
                    """.trimIndent(),
                ),
            )

        assertEquals("catalog-v2", manifest.catalogVersion)
        assertEquals("/mobile-catalog/entries.catalog-v2.json", manifest.snapshotPath)
        assertEquals(424478L, manifest.bytes)
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
}
