package com.djngoma.devilsaidictionary

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
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
        hypeLevel = HypeLevel.high,
        isVendorTerm = false,
        publishedAt = "2026-03-15",
        updatedAt = "2026-03-20",
        warningLabel = null,
        vendorReferences = emptyList(),
        note = null,
        tags = listOf("agents"),
        misunderstoodScore = 5,
        translations = emptyList(),
        diagram = null,
        body = "",
        categorySlugs = listOf("agents-and-workflows"),
        url = "/dictionary/agent",
        searchText = "agent ai workflow orchestration planning tools",
        relatedSlugs = listOf("orchestration"),
    )

    @Test
    fun `slugFromDictionaryPath extracts entry slugs`() {
        assertEquals("agent", slugFromDictionaryPath("/dictionary/agent"))
        assertEquals("agent", slugFromDictionaryPath("/dictionary/agent/"))
        assertNull(slugFromDictionaryPath("/search"))
        assertNull(slugFromDictionaryPath("/dictionary/"))
        assertNull(slugFromDictionaryPath("/dictionary/agent/extra"))
    }

    @Test
    fun `toDictionarySlug accepts app scheme and website deep links`() {
        assertEquals(
            "agent",
            dictionarySlugFromLink(
                scheme = "devilsaidictionary",
                host = "dictionary",
                path = "/agent",
                directSlug = "agent",
            ),
        )
        assertEquals(
            "agent",
            dictionarySlugFromLink(
                scheme = "https",
                host = "thedevilsaidictionary.com",
                path = "/dictionary/agent",
            ),
        )
        assertEquals(
            "agent",
            dictionarySlugFromLink(
                scheme = "https",
                host = "www.thedevilsaidictionary.com",
                path = "/dictionary/agent/",
            ),
        )
        assertNull(
            dictionarySlugFromLink(
                scheme = "https",
                host = "example.com",
                path = "/dictionary/agent",
            ),
        )
    }

    @Test
    fun `dictionary share helpers use the canonical website url`() {
        assertEquals(
            "https://thedevilsaidictionary.com/dictionary/agent",
            dictionaryEntryUrl("agent"),
        )
        assertEquals(
            "Agent | The Devil's AI Dictionary",
            dictionaryShareSubject("Agent"),
        )
        assertEquals(
            """
            Agent
            A workflow with delusions of grandeur.

            https://thedevilsaidictionary.com/dictionary/agent
            """.trimIndent(),
            dictionaryShareText(
                title = "Agent",
                slug = "agent",
                summary = "A workflow with delusions of grandeur.",
            ),
        )
    }

    @Test
    fun `developer mode only stays enabled when the build allows it`() {
        assertTrue(
            resolveDeveloperModeEnabled(
                developerModeAvailable = true,
                storedDeveloperMode = true,
            ),
        )
        assertFalse(
            resolveDeveloperModeEnabled(
                developerModeAvailable = false,
                storedDeveloperMode = true,
            ),
        )
        assertFalse(
            resolveDeveloperModeEnabled(
                developerModeAvailable = true,
                storedDeveloperMode = false,
            ),
        )
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

}
