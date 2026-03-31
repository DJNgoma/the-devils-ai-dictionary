package com.djngoma.devilsaidictionary

import android.content.Intent
import android.net.Uri
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class NativeDictionaryUiTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    @Test
    fun bottomDockSwitchesBetweenMainScreens() {
        val store = NativeDictionaryStore(composeRule.activity)

        composeRule.launchNativeApp(store)

        composeRule.onNodeWithTag(NativeUiTags.HomeScreen).assertIsDisplayed()
        composeRule.onNodeWithTag(NativeUiTags.BottomDock).assertIsDisplayed()

        composeRule.onNodeWithTag(NativeUiTags.TabSearch).performClick()
        composeRule.onNodeWithTag(NativeUiTags.SearchScreen).assertIsDisplayed()

        composeRule.onNodeWithTag(NativeUiTags.TabSaved).performClick()
        composeRule.onNodeWithTag(NativeUiTags.SavedScreen).assertIsDisplayed()
    }

    @Test
    fun deepLinkLaunchOpensEntryDetailAndBackChainReturnsHome() {
        val store = NativeDictionaryStore(composeRule.activity)
        val intent =
            Intent(Intent.ACTION_VIEW, Uri.parse("devilsaidictionary://dictionary/structured-outputs"))

        store.handleIntent(intent)
        composeRule.launchNativeApp(store)

        val entry = checkNotNull(store.entry("structured-outputs"))
        assertEquals(NativeTab.Browse, store.selectedTab)

        composeRule.onNodeWithTag(NativeUiTags.BrowseScreen).assertIsDisplayed()
        composeRule.onNodeWithText(entry.title).assertIsDisplayed()
        composeRule.onNodeWithText("What this term is doing").assertIsDisplayed()

        composeRule.activity.runOnUiThread {
            composeRule.activity.onBackPressedDispatcher.onBackPressed()
        }
        composeRule.waitForIdle()

        composeRule.onNodeWithTag(NativeUiTags.BrowseScreen).assertIsDisplayed()
        composeRule.onAllNodesWithText("What this term is doing").assertCountEquals(0)

        composeRule.activity.runOnUiThread {
            composeRule.activity.onBackPressedDispatcher.onBackPressed()
        }
        composeRule.waitForIdle()

        composeRule.onNodeWithTag(NativeUiTags.HomeScreen).assertIsDisplayed()
    }
}

private fun androidx.compose.ui.test.junit4.AndroidComposeTestRule<*, ComponentActivity>.launchNativeApp(
    store: NativeDictionaryStore,
) {
    activity.runOnUiThread {
        activity.setContent {
            NativeDictionaryApp(
                store = store,
                onMoveTaskToBack = {},
            )
        }
    }
    waitForIdle()
}
