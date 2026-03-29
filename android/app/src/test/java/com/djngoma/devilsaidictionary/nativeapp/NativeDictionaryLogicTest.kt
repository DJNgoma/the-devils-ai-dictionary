package com.djngoma.devilsaidictionary.nativeapp

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
}
