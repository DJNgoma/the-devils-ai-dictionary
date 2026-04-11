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
                            message: "Read \(entry.title) in The Devil's AI Dictionary."
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
        NativeCard {
            NativeSectionLabel(text: "Mental model")
            Text(title)
                .font(.system(size: 24, weight: .semibold, design: .serif))

            VStack(spacing: 12) {
                ForEach(rows.indices, id: \.self) { index in
                    DiagramRow(label: rows[index].0, box: rows[index].1)

                    if index < rows.count - 1 {
                        Text(rows[index].2)
                            .font(.system(size: 11, weight: .semibold, design: .monospaced))
                            .textCase(.uppercase)
                            .foregroundStyle(NativePalette.mutedText)
                    }
                }
            }
        }
    }

    private var title: String {
        switch kind {
        case "rag":
            return "RAG is retrieval plus stuffing"
        case "embeddings":
            return "Embeddings turn meaning into coordinates"
        case "context-window":
            return "A model has limited room on the desk"
        case "function-calling":
            return "The model chooses the call, software does the work"
        default:
            return "MCP separates the assistant from the connectors"
        }
    }

    private var rows: [(String, String, String)] {
        switch kind {
        case "rag":
            return [
                ("Step 1", "User question", "search"),
                ("Step 2", "Retriever fetches documents", "stuff"),
                ("Step 3", "Model answers with extra context", ""),
            ]
        case "embeddings":
            return [
                ("Step 1", "Text or image", "encode"),
                ("Step 2", "Vector representation", "compare"),
                ("Step 3", "Nearest neighbours or clusters", ""),
            ]
        case "context-window":
            return [
                ("Slot 1", "System instructions", "plus"),
                ("Slot 2", "User message", "plus"),
                ("Slot 3", "Retrieved context and tool output", "leaves room for"),
                ("Slot 4", "Space left for the reply", ""),
            ]
        case "function-calling":
            return [
                ("Step 1", "User asks for something", "choose tool"),
                ("Step 2", "Model emits structured arguments", "execute"),
                ("Step 3", "Application runs the tool and returns result", ""),
            ]
        default:
            return [
                ("Layer 1", "Assistant or client app", "requests"),
                ("Layer 2", "MCP server", "brokers"),
                ("Layer 3", "Tools, resources, prompts", ""),
            ]
        }
    }
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
