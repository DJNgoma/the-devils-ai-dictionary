package com.djngoma.devilsaidictionary

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class NativeDictionaryLogicTest {
    private val sampleEntry = Entry(
        title = "Agent",
        slug = "agent",
        letter = "A",
        categories = listOf("Agents and workflows"),
        aliases = listOf("AI agent"),
        devilDefinition = "A workflow with delusions of grandeur.",
        plainDefinition = "A multi-step system that can act with tools.",
        whyExists = "Some tasks take more than one turn.",
        misuse = "People use it for any chatbot with a button.",
        practicalMeaning = "Permissions, orchestration, state, and guardrails.",
        example = "The support agent drafted a response and asked for approval.",
        askNext = listOf("What tools can it use?"),
        related = listOf("orchestration"),
        seeAlso = listOf("workflow"),
        difficulty = Difficulty.beginner,
        technicalDepth = TechnicalDepth.medium,
        isVendorTerm = false,
        publishedAt = "2026-03-15",
        updatedAt = "2026-03-20",
        warningLabel = null,
        vendorReferences = emptyList(),
        note = null,
        translations = emptyList(),
        diagram = null,
        body = "",
        categorySlugs = listOf("agents-and-workflows"),
        searchText = "agent ai workflow orchestration planning tools",
        relatedSlugs = listOf("orchestration"),
    )

    @Test
    fun `slugFromDictionaryPath extracts entry slugs`() {
        assertEquals("agent", slugFromDictionaryPath("/dictionary/agent"))
        assertNull(slugFromDictionaryPath("/search"))
        assertNull(slugFromDictionaryPath("/dictionary/"))
    }

    @Test
    fun `scoreSearchMatch rewards exact and prefix matches`() {
        val exact = scoreSearchMatch(sampleEntry, listOf("agent"))
        val prefix = scoreSearchMatch(sampleEntry, listOf("ag"))
        val missing = scoreSearchMatch(sampleEntry, listOf("nonsense"))

        assertTrue(exact > prefix)
        assertTrue(prefix > 0)
        assertEquals(0, missing)
    }

    @Test
    fun `parseCatalog reads latestPublishedAt from generated shape`() {
        val catalog = parseCatalog(
            JSONObject(
                """
                {
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
                """.trimIndent(),
            ),
        )

        assertEquals("2026-03-15", catalog.latestPublishedAt)
    }

    @Test
    fun `buildDeepLinkTransition opens the entry detail from browse and updates current word`() {
        val transition = buildDeepLinkTransition(sampleEntry)

        assertEquals(NativeTab.Browse, transition.selectedTab)
        assertEquals(
            NativeOverlay.EntryDetail(sampleEntry.slug),
            transition.activeOverlay,
        )
        assertEquals(sampleEntry.slug, transition.currentWord.slug)
        assertEquals(sampleEntry.title, transition.currentWord.title)
        assertEquals(CurrentWordSource.deepLink, transition.currentWord.source)
    }

    @Test
    fun `reduceBackNavigation closes overlay before changing tabs`() {
        val transition = reduceBackNavigation(
            selectedTab = NativeTab.Search,
            activeOverlay = NativeOverlay.EntryDetail(sampleEntry.slug),
        )

        assertEquals(NativeTab.Search, transition?.selectedTab)
        assertNull(transition?.activeOverlay)
    }

    @Test
    fun `reduceBackNavigation falls back to home before backgrounding`() {
        val fromBrowse = reduceBackNavigation(
            selectedTab = NativeTab.Browse,
            activeOverlay = null,
        )
        val fromHome = reduceBackNavigation(
            selectedTab = NativeTab.Home,
            activeOverlay = null,
        )

        assertEquals(NativeTab.Home, fromBrowse?.selectedTab)
        assertNull(fromBrowse?.activeOverlay)
        assertNull(fromHome)
    }
}
