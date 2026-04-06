package com.djngoma.devilsaidictionary

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.OpenInNew
import androidx.compose.material.icons.rounded.AutoStories
import androidx.compose.material.icons.rounded.BookmarkBorder
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.unit.dp

@Composable
fun BookOverlay(
    store: NativeDictionaryStore,
    colors: NativeColors,
    padding: PaddingValues,
) {
    val startPoints =
        listOf(
            "ai-psychosis",
            "inference",
            "openai",
            "agentic-ai",
            "rag",
            "structured-outputs",
        ).mapNotNull(store::entry)

    LazyColumn(
        contentPadding = overlayPadding(padding),
        verticalArrangement = Arrangement.spacedBy(NativeLayout.sectionGap),
    ) {
        item {
            NativeScreenCard(colors = colors, emphasis = true) {
                SectionLabel(text = "Book")
                Text(
                    text = "A field guide for people already in the room",
                    style = MaterialTheme.typography.headlineLarge,
                )
                Text(
                    text = "The dictionary has two jobs. First, to expose inflated language before it hardens into received wisdom. Second, to make the useful distinctions visible: model versus product, retrieval versus memory, structure versus theatre, evaluation versus vibes.",
                    style = MaterialTheme.typography.bodyLarge,
                )
                Text(
                    text = "The entries are short on purpose. If a concept cannot survive plain English, it usually needs less reverence, not more slideware.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodyMedium,
                )
                NativeActionRow {
                    NativePrimaryButton(
                        label = "Save place",
                        colors = colors,
                        onClick = store::saveBook,
                    )
                    NativeSecondaryButton(
                        label = "Search entries",
                        colors = colors,
                        onClick = {
                            store.dismissOverlay()
                            store.selectTab(NativeTab.Search)
                        },
                    )
                }
            }
        }
        item {
            NativeScreenCard(colors = colors) {
                SectionLabel(text = "How this book reads")
                Text("Devil's definition: the memorable line that punctures fog quickly.")
                Text("Straight definition: the technically serious part, useful when you need the room to stop improvising.")
                Text("What to ask next: the questions that turn slogans back into concrete claims.")
            }
        }
        if (startPoints.isNotEmpty()) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    SectionLabel(text = "Good places to start")
                    startPoints.forEach { entry ->
                        EntryCard(entry = entry, colors = colors, compact = true) {
                            store.presentEntry(entry)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun GuideOverlay(
    colors: NativeColors,
    padding: PaddingValues,
) {
    LazyColumn(
        contentPadding = overlayPadding(padding),
        verticalArrangement = Arrangement.spacedBy(NativeLayout.sectionGap),
    ) {
        item {
            NativeScreenCard(colors = colors, emphasis = true) {
                SectionLabel(text = "Guide")
                Text(
                    text = "How to read this dictionary",
                    style = MaterialTheme.typography.headlineLarge,
                )
                Text(
                    text = "Think of each entry as a small trap for inflated language. It opens with the joke, then closes on the actual meaning.",
                    style = MaterialTheme.typography.bodyLarge,
                )
            }
        }
        item {
            NativeScreenCard(colors = colors) {
                SectionLabel(text = "The structure")
                Text("Devil's definition: the sharp line that captures the social function of the term.")
                Text("Straight definition: the clean technical or practical meaning.")
                Text("How people abuse the term: the ways it gets stretched, laundered, or used as camouflage.")
                Text("What to ask next: the questions that convert slogans back into claims you can test.")
            }
        }
        item {
            NativeScreenCard(colors = colors) {
                SectionLabel(text = "The labels")
                Text("Difficulty tracks assumed familiarity, not status.")
                Text("Technical depth tells you how far into the mechanics the entry goes.")
                Text("Warning labels appear when a term is especially abused, especially vague, or mostly marketing.")
            }
        }
    }
}

@Composable
fun AboutOverlay(
    store: NativeDictionaryStore,
    colors: NativeColors,
    padding: PaddingValues,
) {
    val uriHandler = LocalUriHandler.current
    val chatGPT = store.entry("chatgpt")
    val codex = store.entry("codex")

    LazyColumn(
        contentPadding = overlayPadding(padding),
        verticalArrangement = Arrangement.spacedBy(NativeLayout.sectionGap),
    ) {
        item {
            NativeScreenCard(colors = colors, emphasis = true) {
                SectionLabel(text = "About")
                Text(
                    text = "About this book",
                    style = MaterialTheme.typography.headlineLarge,
                )
                Text(
                    text = "The project is for readers who already hear AI jargon daily and would like some of it translated back into English before it damages a strategy deck.",
                    style = MaterialTheme.typography.bodyLarge,
                )
            }
        }
        item {
            NativeScreenCard(colors = colors) {
                Text(
                    text = "The editorial voice is dry on purpose. AI language is often inflated long before it is clarified. A little wit helps puncture that inflation without collapsing into cynicism or boosterism.",
                    style = MaterialTheme.typography.bodyLarge,
                )
                Text(
                    text = "The book is not anti-technology, anti-start-up, or anti-ambition. It is against terminology doing more work than the systems themselves. If a phrase has a legitimate technical meaning, the entry treats it seriously. If it is mostly branding, the entry says so.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodyMedium,
                )
                if (chatGPT != null && codex != null) {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        SectionLabel(text = "Co-authors")
                        EntryCard(entry = chatGPT, colors = colors, compact = true) {
                            store.presentEntry(chatGPT)
                        }
                        EntryCard(entry = codex, colors = colors, compact = true) {
                            store.presentEntry(codex)
                        }
                    }
                }
                TextButton(
                    onClick = {
                        uriHandler.openUri("https://github.com/DJNgoma/the-devils-ai-dictionary")
                    },
                ) {
                    androidx.compose.material3.Icon(
                        imageVector = Icons.AutoMirrored.Rounded.OpenInNew,
                        contentDescription = null,
                    )
                    Spacer(modifier = androidx.compose.ui.Modifier.width(8.dp))
                    Text("Open the public repository")
                }
            }
        }
    }
}

@Composable
fun CategoryOverlay(
    category: CategoryStat,
    store: NativeDictionaryStore,
    colors: NativeColors,
    padding: PaddingValues,
) {
    val entries = store.entriesForCategory(category.slug)

    LazyColumn(
        contentPadding = overlayPadding(padding),
        verticalArrangement = Arrangement.spacedBy(NativeLayout.sectionGap),
    ) {
        item {
            NativeScreenCard(colors = colors, emphasis = true) {
                SectionLabel(text = "Category")
                Text(
                    text = category.title,
                    style = MaterialTheme.typography.headlineLarge,
                )
                Text(
                    text = category.description,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                NativeChip(
                    label = "${category.count} terms",
                    colors = colors,
                    accent = true,
                )
            }
        }

        if (entries.isEmpty()) {
            item {
                NativeScreenCard(colors = colors) {
                    Text(
                        text = "No entries published in this category yet.",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }
        } else {
            items(entries) { entry ->
                EntryCard(entry = entry, colors = colors, compact = true) {
                    store.presentEntry(entry)
                }
            }
        }
    }
}

@Composable
fun MissingEntryOverlay(
    colors: NativeColors,
    padding: PaddingValues,
    isRefreshingCatalog: Boolean,
) {
    LazyColumn(
        contentPadding = overlayPadding(padding),
        verticalArrangement = Arrangement.spacedBy(NativeLayout.sectionGap),
    ) {
        item {
            NativeScreenCard(colors = colors) {
                Text(
                    text = "That entry is missing from the on-device catalogue.",
                    style = MaterialTheme.typography.headlineMedium,
                )
                Text(
                    text =
                        if (isRefreshingCatalog) {
                            "The app is checking for a fresher on-device catalogue before it gives up on this slug."
                        } else {
                            "The app retried once against the latest published catalogue it could reach and still could not resolve this slug."
                        },
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun EntryDetailOverlay(
    entry: Entry,
    store: NativeDictionaryStore,
    colors: NativeColors,
    padding: PaddingValues,
) {
    val relatedEntries = store.relatedEntriesFor(entry)

    LazyColumn(
        contentPadding = overlayPadding(padding),
        verticalArrangement = Arrangement.spacedBy(NativeLayout.sectionGap),
    ) {
        item {
            NativeScreenCard(colors = colors, emphasis = true) {
                SectionLabel(text = "Dictionary")
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    NativeChip(label = entry.letter, colors = colors, accent = true)
                    NativeChip(label = difficultyLabel(entry.difficulty), colors = colors)
                    NativeChip(label = technicalDepthLabel(entry.technicalDepth), colors = colors)
                    if (entry.isVendorTerm) {
                        NativeChip(label = "Vendor term", colors = colors, accent = true)
                    }
                    entry.categories.forEach { category ->
                        NativeChip(label = category, colors = colors)
                    }
                }
                Text(
                    text = entry.title,
                    style = MaterialTheme.typography.headlineLarge,
                )
                Text(
                    text = entry.devilDefinition.trim(),
                    style = MaterialTheme.typography.bodyLarge,
                )
                Text(
                    text = entry.plainDefinition.trim(),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodyMedium,
                )
                Text(
                    text = "Published ${formatDisplayDate(entry.publishedAt)}   Updated ${formatDisplayDate(entry.updatedAt)}",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (entry.aliases.isNotEmpty()) {
                    Text(
                        text = "Also known as ${entry.aliases.joinToString()}",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                NativeActionRow {
                    NativePrimaryButton(
                        label = "Save place",
                        colors = colors,
                        onClick = { store.save(entry) },
                    )
                    NativeSecondaryButton(
                        label = "Related terms",
                        colors = colors,
                        onClick = {
                            store.dismissOverlay()
                            store.showCategoryInSearch(entry.categorySlugs.firstOrNull())
                        },
                    )
                    NativeSecondaryButton(
                        label = "Share",
                        colors = colors,
                        onClick = { store.shareEntry(entry) },
                    )
                }
            }
        }

        item {
            NativeScreenCard(colors = colors) {
                SectionLabel(text = "What this term is doing")
                Text(
                    text = entry.whyExists.trim(),
                    style = MaterialTheme.typography.bodyLarge,
                )
                Text(
                    text = entry.practicalMeaning.trim(),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        item {
            NativeScreenCard(colors = colors) {
                SectionLabel(text = "How people abuse it")
                Text(
                    text = entry.misuse.trim(),
                    style = MaterialTheme.typography.bodyLarge,
                )
                Text(
                    text = entry.example.trim(),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        if (entry.askNext.isNotEmpty()) {
            item {
                NativeScreenCard(colors = colors) {
                    SectionLabel(text = "What to ask next")
                    entry.askNext.forEach { question ->
                        Text(
                            text = "• $question",
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                }
            }
        }

        if (entry.note != null || entry.body.isNotBlank()) {
            item {
                NativeScreenCard(colors = colors) {
                    SectionLabel(text = "Notes")
                    entry.note?.takeIf(String::isNotBlank)?.let { note ->
                        Text(
                            text = note.trim(),
                            style = MaterialTheme.typography.bodyLarge,
                        )
                    }
                    entry.body.takeIf(String::isNotBlank)?.let { body ->
                        Text(
                            text = body.trim(),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }

        if (entry.translations.isNotEmpty()) {
            item {
                NativeScreenCard(colors = colors) {
                    SectionLabel(text = "Translations")
                    entry.translations.forEach { translation ->
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(
                                text = translation.label,
                                style = MaterialTheme.typography.titleMedium,
                            )
                            Text(
                                text = translation.text,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }

        if (relatedEntries.isNotEmpty()) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    SectionLabel(text = "Related")
                    relatedEntries.forEach { related ->
                        EntryCard(entry = related, colors = colors, compact = true) {
                            store.presentEntry(related)
                        }
                    }
                }
            }
        }
    }
}
