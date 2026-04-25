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
                    ConfirmingSaveButton(
                        label = "Save word",
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
fun RelatedTermsOverlay(
    entry: Entry,
    store: NativeDictionaryStore,
    colors: NativeColors,
    padding: PaddingValues,
) {
    val related = store.relatedEntriesFor(entry)

    LazyColumn(
        contentPadding = overlayPadding(padding),
        verticalArrangement = Arrangement.spacedBy(NativeLayout.sectionGap),
    ) {
        item {
            NativeScreenCard(colors = colors, emphasis = true) {
                SectionLabel(text = "Related terms")
                Text(
                    text = entry.title,
                    style = MaterialTheme.typography.headlineLarge,
                )
                Text(
                    text = "Entries that share a category or see-also with this term.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        if (related.isEmpty()) {
            item {
                NativeScreenCard(colors = colors) {
                    Text(
                        text = "No related terms on record yet.",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }
        } else {
            items(related) { other ->
                EntryCard(entry = other, colors = colors, compact = true) {
                    store.presentEntry(other)
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
    val seeAlsoReferences =
        entry.resolvedSeeAlso.ifEmpty { entry.seeAlso.map { EntryReference(label = it) } }
    val vendorReferenceLinks =
        entry.resolvedVendorReferences.ifEmpty {
            entry.vendorReferences.map { EntryReference(label = it) }
        }

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
                    ConfirmingSaveButton(
                        label = "Save word",
                        colors = colors,
                        onClick = { store.save(entry) },
                    )
                    NativeSecondaryButton(
                        label = "Related terms",
                        colors = colors,
                        onClick = { store.presentRelatedTerms(entry.slug) },
                    )
                    NativeSecondaryButton(
                        label = "Share",
                        colors = colors,
                        onClick = { store.shareEntry(entry) },
                    )
                }
            }
        }

        entry.diagram?.let { diagram ->
            termDiagramDefinition(diagram)?.let { definition ->
                item {
                    NativeTermDiagramCard(
                        definition = definition,
                        colors = colors,
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

        if (seeAlsoReferences.isNotEmpty()) {
            item {
                NativeScreenCard(colors = colors) {
                    SectionLabel(text = "See also")
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        seeAlsoReferences.forEach { reference ->
                            val related = store.entryForReference(reference)
                            NativeSecondaryButton(
                                label = reference.label,
                                colors = colors,
                                onClick = {
                                    if (related != null) {
                                        store.presentEntry(related)
                                    } else {
                                        store.showReferenceResults(reference.label)
                                    }
                                },
                            )
                        }
                    }
                }
            }
        }

        if (vendorReferenceLinks.isNotEmpty()) {
            item {
                NativeScreenCard(colors = colors) {
                    SectionLabel(text = "Vendor references")
                    vendorReferenceLinks.forEach { reference ->
                        val related = store.entryForReference(reference)
                        if (related != null) {
                            TextButton(onClick = { store.presentEntry(related) }) {
                                Text(text = reference.label)
                            }
                        } else {
                            Text(
                                text = reference.label,
                                style = MaterialTheme.typography.bodyMedium,
                            )
                        }
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

data class NativeTermDiagramDefinition(
    val title: String,
    val steps: List<NativeTermDiagramStep>,
)

data class NativeTermDiagramStep(
    val label: String,
    val text: String,
    val connectorAfter: String? = null,
)

fun termDiagramDefinition(kind: String): NativeTermDiagramDefinition? =
    when (kind) {
        "rag" -> NativeTermDiagramDefinition(
            title = "RAG is retrieval plus stuffing",
            steps = listOf(
                NativeTermDiagramStep("Step 1", "User question", "search"),
                NativeTermDiagramStep("Step 2", "Retriever fetches documents", "stuff"),
                NativeTermDiagramStep("Step 3", "Model answers with extra context"),
            ),
        )
        "embeddings" -> NativeTermDiagramDefinition(
            title = "Embeddings turn meaning into coordinates",
            steps = listOf(
                NativeTermDiagramStep("Step 1", "Text or image", "encode"),
                NativeTermDiagramStep("Step 2", "Vector representation", "compare"),
                NativeTermDiagramStep("Step 3", "Nearest neighbours or clusters"),
            ),
        )
        "context-window" -> NativeTermDiagramDefinition(
            title = "A model has limited room on the desk",
            steps = listOf(
                NativeTermDiagramStep("Slot 1", "System instructions", "plus"),
                NativeTermDiagramStep("Slot 2", "User message", "plus"),
                NativeTermDiagramStep("Slot 3", "Retrieved context and tool output", "leaves room for"),
                NativeTermDiagramStep("Slot 4", "Space left for the reply"),
            ),
        )
        "function-calling" -> NativeTermDiagramDefinition(
            title = "The model chooses the call, software does the work",
            steps = listOf(
                NativeTermDiagramStep("Step 1", "User asks for something", "choose tool"),
                NativeTermDiagramStep("Step 2", "Model emits structured arguments", "execute"),
                NativeTermDiagramStep("Step 3", "Application runs the tool and returns result"),
            ),
        )
        "mcp" -> NativeTermDiagramDefinition(
            title = "MCP separates the assistant from the connectors",
            steps = listOf(
                NativeTermDiagramStep("Layer 1", "Assistant or client app", "requests"),
                NativeTermDiagramStep("Layer 2", "MCP server", "brokers"),
                NativeTermDiagramStep("Layer 3", "Tools, resources, prompts"),
            ),
        )
        "agent-loop" -> NativeTermDiagramDefinition(
            title = "Agents are loops with permission",
            steps = listOf(
                NativeTermDiagramStep("Step 1", "Goal and constraints", "plan"),
                NativeTermDiagramStep("Step 2", "Tool, browser, or code action", "observe"),
                NativeTermDiagramStep("Step 3", "Continue, ask, or stop"),
            ),
        )
        "model-routing" -> NativeTermDiagramDefinition(
            title = "Routing is policy with a bill attached",
            steps = listOf(
                NativeTermDiagramStep("Step 1", "Application request", "classify"),
                NativeTermDiagramStep("Step 2", "Gateway applies policy and budget", "route"),
                NativeTermDiagramStep("Step 3", "Selected model or fallback"),
            ),
        )
        "skill-loading" -> NativeTermDiagramDefinition(
            title = "Skills load guidance only when the task earns it",
            steps = listOf(
                NativeTermDiagramStep("Step 1", "User task", "match"),
                NativeTermDiagramStep("Step 2", "Skill instructions load on demand", "use"),
                NativeTermDiagramStep("Step 3", "Scripts and resources stay scoped"),
            ),
        )
        "worktree" -> NativeTermDiagramDefinition(
            title = "A worktree gives the agent a separate bench",
            steps = listOf(
                NativeTermDiagramStep("Step 1", "Main checkout stays steady", "branch"),
                NativeTermDiagramStep("Step 2", "Linked worktree gets isolated edits", "verify"),
                NativeTermDiagramStep("Step 3", "Merge, keep, or discard"),
            ),
        )
        else -> null
    }

@Composable
private fun NativeTermDiagramCard(
    definition: NativeTermDiagramDefinition,
    colors: NativeColors,
) {
    NativeScreenCard(colors = colors) {
        SectionLabel(text = "Mental model")
        Text(
            text = definition.title,
            style = MaterialTheme.typography.titleLarge,
        )
        definition.steps.forEach { step ->
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                NativeChip(label = step.label, colors = colors, accent = true)
                Text(
                    text = step.text,
                    modifier = androidx.compose.ui.Modifier.fillMaxWidth(),
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
            step.connectorAfter?.let { connector ->
                Text(
                    text = connector.uppercase(),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}
