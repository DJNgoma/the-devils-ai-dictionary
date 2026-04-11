package com.djngoma.devilsaidictionary

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ReviewPromptPolicyTest {
    private val nowMs = 1_750_000_000_000L

    @Test
    fun `prompts after repeated use`() {
        val state =
            ReviewPromptState(
                activeDayCount = 5,
                entryOpenCount = 12,
                lastPromptAtMs = null,
                lastPromptedVersion = null,
            )

        assertTrue(ReviewPromptPolicy.shouldPrompt(state, nowMs, "1.0.2"))
    }

    @Test
    fun `does not prompt before the app has been used a fair bit`() {
        val state =
            ReviewPromptState(
                activeDayCount = 2,
                entryOpenCount = 7,
                lastPromptAtMs = null,
                lastPromptedVersion = null,
            )

        assertFalse(ReviewPromptPolicy.shouldPrompt(state, nowMs, "1.0.2"))
    }

    @Test
    fun `does not prompt again for the same version`() {
        val state =
            ReviewPromptState(
                activeDayCount = 9,
                entryOpenCount = 40,
                lastPromptAtMs = nowMs - 200L * 24 * 60 * 60 * 1000,
                lastPromptedVersion = "1.0.2",
            )

        assertFalse(ReviewPromptPolicy.shouldPrompt(state, nowMs, "1.0.2"))
    }

    @Test
    fun `does not prompt again before the cooldown expires`() {
        val state =
            ReviewPromptState(
                activeDayCount = 9,
                entryOpenCount = 40,
                lastPromptAtMs = nowMs - 30L * 24 * 60 * 60 * 1000,
                lastPromptedVersion = "1.0.1",
            )

        assertFalse(ReviewPromptPolicy.shouldPrompt(state, nowMs, "1.0.2"))
    }
}
