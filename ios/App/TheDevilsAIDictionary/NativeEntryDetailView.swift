import SwiftUI

#if canImport(DevilsAIDictionaryCore)
import DevilsAIDictionaryCore
#endif

struct NativeEntryDetailView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var model: NativeDictionaryModel
    let entry: Entry
    var showsCloseButton = true

    var body: some View {
        NativeScreen { layout in
            NativeCard(emphasis: true) {
                NativeSectionLabel(text: "Dictionary")

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        NativeChip(label: entry.letter, tone: .accent)
                        NativeChip(label: nativeDifficultyLabel(entry.difficulty))
                        NativeChip(label: nativeTechnicalDepthLabel(entry.technicalDepth))

                        if entry.isVendorTerm {
                            NativeChip(label: "Vendor term", tone: .success)
                        }

                        ForEach(entry.categories, id: \.self) { category in
                            NativeChip(label: category)
                        }
                    }
                }

                Text(entry.title)
                    .font(.system(size: 36, weight: .bold, design: .serif))
                    .accessibilityIdentifier("entry.title")

                Text(entry.devilDefinition.trimmingCharacters(in: .whitespacesAndNewlines))
                    .font(.system(size: 22, weight: .medium, design: .serif))

                Text(entry.plainDefinition.trimmingCharacters(in: .whitespacesAndNewlines))
                    .font(.system(size: 17, weight: .regular, design: .rounded))
                    .foregroundStyle(NativePalette.mutedText)

                HStack {
                    Text("Published \(nativeFormattedDate(entry.publishedAt))")
                    Text("Updated \(nativeFormattedDate(entry.updatedAt))")
                }
                .font(.system(size: 13, weight: .regular, design: .rounded))
                .foregroundStyle(NativePalette.mutedText)

                if !entry.aliases.isEmpty {
                    Text("Also known as \(entry.aliases.joined(separator: ", "))")
                        .font(.system(size: 13, weight: .medium, design: .rounded))
                        .foregroundStyle(NativePalette.mutedText)
                }

                HStack {
                    SaveConfirmButton(label: "Save word") {
                        model.save(entry: entry)
                    }

                    Button("Related terms") {
                        model.presentRelatedTerms(for: entry)
                    }
                    .buttonStyle(NativeSecondaryButtonStyle())

                    if let shareURL = model.shareURL(for: entry) {
                        NativeShareButton(
                            url: shareURL,
                            subject: entry.title,
                            message: model.shareText(for: entry),
                            imageURL: model.shareImageURL(for: entry)
                        )
                    }
                }
            }
            .frame(maxWidth: layout.readingColumnWidth, alignment: .leading)

            if !entry.translations.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    NativeSectionLabel(text: "Translations")

                    LazyVGrid(columns: layout.cardGridItems, alignment: .leading, spacing: 12) {
                        ForEach(entry.translations, id: \.label) { translation in
                            NativeCard {
                                NativeSectionLabel(text: translation.label)
                                Text(translation.text)
                                    .font(.system(size: 15, weight: .regular, design: .rounded))
                            }
                        }
                    }
                }
                .frame(maxWidth: layout.readingColumnWidth, alignment: .leading)
            }

            if let diagram = entry.diagram {
                NativeTermDiagramView(kind: diagram)
                    .frame(maxWidth: layout.readingColumnWidth, alignment: .leading)
            }

            NativeEntrySectionCard(title: "Straight definition", bodyText: entry.plainDefinition)
                .frame(maxWidth: layout.readingColumnWidth, alignment: .leading)
            NativeEntrySectionCard(title: "Why this term exists", bodyText: entry.whyExists)
                .frame(maxWidth: layout.readingColumnWidth, alignment: .leading)
            NativeEntrySectionCard(title: "How people abuse the term", bodyText: entry.misuse)
                .frame(maxWidth: layout.readingColumnWidth, alignment: .leading)
            NativeEntrySectionCard(title: "What it usually means in practice", bodyText: entry.practicalMeaning)
                .frame(maxWidth: layout.readingColumnWidth, alignment: .leading)
            NativeEntrySectionCard(title: "Practical example", bodyText: entry.example, italic: true)
                .frame(maxWidth: layout.readingColumnWidth, alignment: .leading)

            if !entry.askNext.isEmpty {
                NativeCard {
                    NativeSectionLabel(text: "What to ask next")
                    VStack(alignment: .leading, spacing: 10) {
                        ForEach(entry.askNext, id: \.self) { question in
                            HStack(alignment: .top, spacing: 10) {
                                Image(systemName: "arrow.turn.down.right")
                                    .foregroundStyle(NativePalette.accent)
                                Text(question)
                                    .font(.system(size: 15, weight: .regular, design: .rounded))
                            }
                        }
                    }
                }
                .frame(maxWidth: layout.readingColumnWidth, alignment: .leading)
            }

            if !entry.seeAlso.isEmpty {
                NativeCard {
                    NativeSectionLabel(text: "See also")
                    FlowLayout(spacing: 8) {
                        ForEach(entry.seeAlso, id: \.self) { label in
                            if let related = model.entry(forSeeAlsoLabel: label) {
                                Button(label) {
                                    model.presentEntry(related)
                                }
                                .buttonStyle(NativeFilterChipButtonStyle(isSelected: false))
                            } else {
                                Button(label) {
                                    model.showSeeAlsoResults(for: label)
                                }
                                .buttonStyle(NativeFilterChipButtonStyle(isSelected: false))
                            }
                        }
                    }
                }
                .frame(maxWidth: layout.readingColumnWidth, alignment: .leading)
            }

            if let note = entry.note, !note.isEmpty {
                NativeEntrySectionCard(title: "Context note", bodyText: note)
                    .frame(maxWidth: layout.readingColumnWidth, alignment: .leading)
            }

            if !entry.vendorReferences.isEmpty {
                NativeCard {
                    NativeSectionLabel(text: "Vendor references")
                    VStack(alignment: .leading, spacing: 10) {
                        ForEach(entry.vendorReferences, id: \.self) { reference in
                            Text(reference)
                                .font(.system(size: 15, weight: .regular, design: .rounded))
                        }
                    }
                }
                .frame(maxWidth: layout.readingColumnWidth, alignment: .leading)
            }

            if !entry.body.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                NativeCard {
                    NativeSectionLabel(text: "Editorial aside")
                    Text(.init(entry.body))
                        .font(.system(size: 15, weight: .regular, design: .rounded))
                }
                .frame(maxWidth: layout.readingColumnWidth, alignment: .leading)
            }

            let relatedEntries = model.relatedEntries(for: entry)
            if !relatedEntries.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    NativeSectionLabel(text: "Related terms")

                    LazyVGrid(columns: layout.cardGridItems, alignment: .leading, spacing: 12) {
                        ForEach(relatedEntries, id: \.slug) { related in
                            NativeEntryCard(entry: related, compact: true) {
                                model.presentEntry(related)
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle(entry.title)
        .nativeNavigationBarTitleDisplayMode(.inline)
        .accessibilityIdentifier("entry.detail")
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                if showsCloseButton && !model.isDeveloperScreenshotMode {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

private struct NativeEntrySectionCard: View {
    let title: String
    let bodyText: String
    var italic = false

    var body: some View {
        NativeCard {
            NativeSectionLabel(text: title)
            Text(bodyText.trimmingCharacters(in: .whitespacesAndNewlines))
                .font(italic ? .system(size: 16, weight: .regular, design: .serif) : .system(size: 15, weight: .regular, design: .rounded))
        }
    }
}

private struct NativeTermDiagramView: View {
    let kind: String

    var body: some View {
        Group {
            if let definition = NativeTermDiagramDefinition(kind: kind) {
                NativeCard {
                    NativeSectionLabel(text: "Mental model")
                    Text(definition.title)
                        .font(.system(size: 24, weight: .semibold, design: .serif))

                    VStack(spacing: 12) {
                        ForEach(definition.steps.indices, id: \.self) { index in
                            let step = definition.steps[index]
                            DiagramRow(label: step.label, box: step.text)

                            if let connector = step.connectorAfter {
                                Text(connector)
                                    .font(.system(size: 11, weight: .semibold, design: .monospaced))
                                    .textCase(.uppercase)
                                    .foregroundStyle(NativePalette.mutedText)
                            }
                        }
                    }
                }
            }
        }
    }
}

private struct NativeTermDiagramDefinition {
    let title: String
    let steps: [NativeTermDiagramStep]

    init?(kind: String) {
        switch kind {
        case "rag":
            title = "RAG is retrieval plus stuffing"
            steps = [
                NativeTermDiagramStep(label: "Step 1", text: "User question", connectorAfter: "search"),
                NativeTermDiagramStep(label: "Step 2", text: "Retriever fetches documents", connectorAfter: "stuff"),
                NativeTermDiagramStep(label: "Step 3", text: "Model answers with extra context"),
            ]
        case "embeddings":
            title = "Embeddings turn meaning into coordinates"
            steps = [
                NativeTermDiagramStep(label: "Step 1", text: "Text or image", connectorAfter: "encode"),
                NativeTermDiagramStep(label: "Step 2", text: "Vector representation", connectorAfter: "compare"),
                NativeTermDiagramStep(label: "Step 3", text: "Nearest neighbours or clusters"),
            ]
        case "context-window":
            title = "A model has limited room on the desk"
            steps = [
                NativeTermDiagramStep(label: "Slot 1", text: "System instructions", connectorAfter: "plus"),
                NativeTermDiagramStep(label: "Slot 2", text: "User message", connectorAfter: "plus"),
                NativeTermDiagramStep(label: "Slot 3", text: "Retrieved context and tool output", connectorAfter: "leaves room for"),
                NativeTermDiagramStep(label: "Slot 4", text: "Space left for the reply"),
            ]
        case "function-calling":
            title = "The model chooses the call, software does the work"
            steps = [
                NativeTermDiagramStep(label: "Step 1", text: "User asks for something", connectorAfter: "choose tool"),
                NativeTermDiagramStep(label: "Step 2", text: "Model emits structured arguments", connectorAfter: "execute"),
                NativeTermDiagramStep(label: "Step 3", text: "Application runs the tool and returns result"),
            ]
        case "mcp":
            title = "MCP separates the assistant from the connectors"
            steps = [
                NativeTermDiagramStep(label: "Layer 1", text: "Assistant or client app", connectorAfter: "requests"),
                NativeTermDiagramStep(label: "Layer 2", text: "MCP server", connectorAfter: "brokers"),
                NativeTermDiagramStep(label: "Layer 3", text: "Tools, resources, prompts"),
            ]
        case "agent-loop":
            title = "Agents are loops with permission"
            steps = [
                NativeTermDiagramStep(label: "Step 1", text: "Goal and constraints", connectorAfter: "plan"),
                NativeTermDiagramStep(label: "Step 2", text: "Tool, browser, or code action", connectorAfter: "observe"),
                NativeTermDiagramStep(label: "Step 3", text: "Continue, ask, or stop"),
            ]
        case "model-routing":
            title = "Routing is policy with a bill attached"
            steps = [
                NativeTermDiagramStep(label: "Step 1", text: "Application request", connectorAfter: "classify"),
                NativeTermDiagramStep(label: "Step 2", text: "Gateway applies policy and budget", connectorAfter: "route"),
                NativeTermDiagramStep(label: "Step 3", text: "Selected model or fallback"),
            ]
        case "skill-loading":
            title = "Skills load guidance only when the task earns it"
            steps = [
                NativeTermDiagramStep(label: "Step 1", text: "User task", connectorAfter: "match"),
                NativeTermDiagramStep(label: "Step 2", text: "Skill instructions load on demand", connectorAfter: "use"),
                NativeTermDiagramStep(label: "Step 3", text: "Scripts and resources stay scoped"),
            ]
        case "worktree":
            title = "A worktree gives the agent a separate bench"
            steps = [
                NativeTermDiagramStep(label: "Step 1", text: "Main checkout stays steady", connectorAfter: "branch"),
                NativeTermDiagramStep(label: "Step 2", text: "Linked worktree gets isolated edits", connectorAfter: "verify"),
                NativeTermDiagramStep(label: "Step 3", text: "Merge, keep, or discard"),
            ]
        default:
            return nil
        }
    }
}

private struct NativeTermDiagramStep {
    let label: String
    let text: String
    var connectorAfter: String? = nil
}

private struct DiagramRow: View {
    let label: String
    let box: String

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            NativeChip(label: label, tone: .accent)
            Text(box)
                .font(.system(size: 15, weight: .medium, design: .rounded))
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(NativePalette.panelStrong, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .stroke(NativePalette.border, lineWidth: 1)
                )
        }
    }
}

private struct FlowLayout<Data: View>: View {
    let spacing: CGFloat
    @ViewBuilder let content: Data

    var body: some View {
        VStack(alignment: .leading, spacing: spacing) {
            content
        }
    }
}
