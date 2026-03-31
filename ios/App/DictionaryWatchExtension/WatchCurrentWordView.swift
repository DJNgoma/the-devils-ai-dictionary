import SwiftUI

#if canImport(DevilsAIDictionaryCore)
import DevilsAIDictionaryCore
#endif

struct WatchCurrentWordView: View {
    @ObservedObject var model: WatchCurrentWordModel

    var body: some View {
        NavigationStack {
            List {
                currentWordSection
                featureSection
                recentSection
                misunderstoodSection
            }
            .listStyle(.carousel)
            .navigationTitle("Dictionary")
            .navigationDestination(for: String.self) { slug in
                if let entry = model.entry(slug: slug) {
                    WatchEntryDetailView(model: model, entry: entry)
                } else {
                    WatchMissingEntryView()
                }
            }
        }
    }

    @ViewBuilder
    private var currentWordSection: some View {
        Section("Today's word") {
            if let todayWord = model.todayWord {
                VStack(alignment: .leading, spacing: 10) {
                    NavigationLink(value: todayWord.slug) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(todayWord.title)
                                .font(.system(.title3, design: .serif, weight: .semibold))
                                .foregroundStyle(.primary)

                            Text(todayWord.devilDefinition.trimmingCharacters(in: .whitespacesAndNewlines))
                                .font(.system(.body, design: .rounded))
                                .foregroundStyle(.primary)
                                .lineLimit(6)
                        }
                    }
                    .buttonStyle(.plain)

                    if let warningLabel = todayWord.warningLabel {
                        Text(warningLabel)
                            .font(.system(.footnote, design: .rounded, weight: .medium))
                            .padding(8)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.red.opacity(0.14), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }

                    HStack {
                        if let randomEntry = model.randomEntry() {
                            NavigationLink(value: randomEntry.slug) {
                                Text("Random entry")
                            }
                            .buttonStyle(.borderedProminent)
                        }

                        Button("iPhone") {
                            model.openOnPhone()
                        }
                        .buttonStyle(.bordered)
                    }
                }
                .padding(.vertical, 4)
            } else if let loadError = model.loadError {
                Text(loadError)
                    .font(.system(.footnote, design: .rounded))
                    .foregroundStyle(.secondary)
            } else {
                ProgressView()
                    .frame(maxWidth: .infinity, alignment: .center)
            }
        }
    }

    @ViewBuilder
    private var featureSection: some View {
        if let featuredEntry = model.featuredEntry {
            Section("Featured") {
                NavigationLink(value: featuredEntry.slug) {
                        WatchEntryRow(
                            entry: featuredEntry,
                            eyebrow: "Editor's pick",
                            isCurrentWord: model.isTodayWord(featuredEntry)
                        )
                }
            }
        }
    }

    @ViewBuilder
    private var recentSection: some View {
        if !model.recentEntries.isEmpty {
            Section("Recent") {
                ForEach(model.recentEntries, id: \.slug) { entry in
                    NavigationLink(value: entry.slug) {
                        WatchEntryRow(
                            entry: entry,
                            eyebrow: "Recent",
                            isCurrentWord: model.isTodayWord(entry)
                        )
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var misunderstoodSection: some View {
        if !model.misunderstoodEntries.isEmpty {
            Section("Misunderstood") {
                ForEach(model.misunderstoodEntries, id: \.slug) { entry in
                    NavigationLink(value: entry.slug) {
                        WatchEntryRow(
                            entry: entry,
                            eyebrow: "Often abused",
                            isCurrentWord: model.isTodayWord(entry)
                        )
                    }
                }
            }
        }
    }
}

private struct WatchEntryRow: View {
    let entry: Entry
    let eyebrow: String
    let isCurrentWord: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Text(eyebrow)
                    .font(.system(.caption2, design: .rounded, weight: .semibold))
                    .foregroundStyle(.secondary)

                if isCurrentWord {
                    Text("Live")
                        .font(.system(.caption2, design: .rounded, weight: .bold))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.orange.opacity(0.16), in: Capsule())
                }
            }

            Text(entry.title)
                .font(.system(.headline, design: .serif, weight: .semibold))
                .foregroundStyle(.primary)

            Text(entry.devilDefinition.trimmingCharacters(in: .whitespacesAndNewlines))
                .font(.system(.footnote, design: .rounded))
                .foregroundStyle(.secondary)
                .lineLimit(3)
        }
        .padding(.vertical, 2)
    }
}

private struct WatchEntryDetailView: View {
    @ObservedObject var model: WatchCurrentWordModel
    let entry: Entry

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 6) {
                    Text(entry.letter)
                        .font(.system(.caption2, design: .rounded, weight: .bold))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(Color.orange.opacity(0.16), in: Capsule())

                    Text(entry.difficulty.watchLabel)
                        .font(.system(.caption2, design: .rounded, weight: .medium))
                        .foregroundStyle(.secondary)
                }

                Text(entry.title)
                    .font(.system(.title3, design: .serif, weight: .semibold))

                Text(entry.devilDefinition.trimmingCharacters(in: .whitespacesAndNewlines))
                    .font(.system(.body, design: .rounded))

                Text(entry.plainDefinition.trimmingCharacters(in: .whitespacesAndNewlines))
                    .font(.system(.footnote, design: .rounded))
                    .foregroundStyle(.secondary)

                if let warningLabel = entry.warningLabel {
                    Text(warningLabel)
                        .font(.system(.footnote, design: .rounded, weight: .medium))
                        .padding(8)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.red.opacity(0.14), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }

                WatchDetailSection(title: "Why it exists", text: entry.whyExists)
                WatchDetailSection(title: "In practice", text: entry.practicalMeaning)

                if let firstQuestion = entry.askNext.first {
                    WatchDetailSection(title: "Ask next", text: firstQuestion)
                }

                VStack(spacing: 8) {
                    if let randomEntry = model.randomEntry() {
                        NavigationLink(value: randomEntry.slug) {
                            Text("Random entry")
                        }
                        .buttonStyle(.borderedProminent)
                    }

                    Button("Open on iPhone") {
                        model.openOnPhone(slug: entry.slug)
                    }
                    .buttonStyle(.bordered)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 4)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
        }
        .navigationTitle(entry.title)
        .navigationBarTitleDisplayMode(.inline)
        .containerBackground(.background.tertiary, for: .navigation)
    }
}

private struct WatchDetailSection: View {
    let title: String
    let text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(.caption2, design: .rounded, weight: .semibold))
                .foregroundStyle(.secondary)

            Text(text.trimmingCharacters(in: .whitespacesAndNewlines))
                .font(.system(.footnote, design: .rounded))
                .foregroundStyle(.primary)
        }
    }
}

private struct WatchMissingEntryView: View {
    var body: some View {
        Text("That entry is not available in the bundled watch catalog.")
            .font(.system(.footnote, design: .rounded))
            .foregroundStyle(.secondary)
            .padding()
    }
}

private extension Difficulty {
    var watchLabel: String {
        switch self {
        case .advanced:
            return "Advanced"
        case .beginner:
            return "Beginner"
        case .intermediate:
            return "Intermediate"
        }
    }
}

#Preview {
    WatchCurrentWordView(model: WatchCurrentWordModel())
}
