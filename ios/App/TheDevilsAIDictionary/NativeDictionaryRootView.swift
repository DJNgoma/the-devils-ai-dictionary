import SwiftUI

#if canImport(DevilsAIDictionaryCore)
import DevilsAIDictionaryCore
#endif

struct NativeDictionaryRootView: View {
    @StateObject private var model: NativeDictionaryModel
    @ObservedObject private var themeManager = ThemeManager.shared

    init(model: NativeDictionaryModel) {
        _model = StateObject(wrappedValue: model)
    }

    var body: some View {
        TabView(selection: $model.selectedTab) {
            NavigationView {
                NativeHomeView(model: model)
            }
            .navigationViewStyle(.stack)
            .tabItem {
                Label("Home", systemImage: "house")
            }
            .tag(NativeDictionaryModel.AppTab.home)

            NavigationView {
                NativeBrowseView(model: model)
            }
            .navigationViewStyle(.stack)
            .tabItem {
                Label("Browse", systemImage: "books.vertical")
            }
            .tag(NativeDictionaryModel.AppTab.browse)

            NavigationView {
                NativeSearchView(model: model)
            }
            .navigationViewStyle(.stack)
            .tabItem {
                Label("Search", systemImage: "magnifyingglass")
            }
            .tag(NativeDictionaryModel.AppTab.search)

            NavigationView {
                NativeSavedView(model: model)
            }
            .navigationViewStyle(.stack)
            .tabItem {
                Label("Saved", systemImage: "bookmark")
            }
            .tag(NativeDictionaryModel.AppTab.saved)

            NavigationView {
                NativeSettingsView(model: model)
            }
            .navigationViewStyle(.stack)
            .tabItem {
                Label("Settings", systemImage: "slider.horizontal.3")
            }
            .tag(NativeDictionaryModel.AppTab.settings)
        }
        .tint(NativePalette.accent)
        .id(themeManager.current)
        .preferredColorScheme(themeManager.current.colorScheme)
        .sheet(item: $model.activeSheet) { sheet in
            NavigationView {
                switch sheet {
                case .about:
                    NativeAboutView(model: model)
                case .book:
                    NativeBookView(model: model)
                case .guide:
                    NativeGuideView()
                case .entry(let slug):
                    if let entry = model.entry(slug: slug) {
                        NativeEntryDetailView(model: model, entry: entry)
                    } else {
                        NativeMissingEntryView()
                    }
                }
            }
            .navigationViewStyle(.stack)
        }
    }
}

private struct NativeHomeView: View {
    @ObservedObject var model: NativeDictionaryModel

    var body: some View {
        NativeScreen { layout in
            NativeCard(emphasis: true) {
                NativeSectionLabel(text: "Online book")

                Text("The Devil's AI Dictionary")
                    .font(.system(size: 34, weight: .bold, design: .serif))

                Text("A sceptical field guide to the language machines, marketers, founders, and consultants use when they want to sound smarter than they are.")
                    .font(.system(size: 18, weight: .medium, design: .rounded))
                    .foregroundStyle(.primary)

                Text("This is the native Apple edition: bundled content, local search, saved reading place, deep links, notifications, and watch sync without the webview in the middle pretending to be architecture.")
                    .font(.system(size: 15, weight: .regular, design: .rounded))
                    .foregroundStyle(NativePalette.mutedText)

                HStack {
                    Button("Read the book") {
                        model.presentBook()
                    }
                    .buttonStyle(NativePrimaryButtonStyle())

                    Button("Random entry") {
                        model.openRandomEntry()
                    }
                    .buttonStyle(NativeSecondaryButtonStyle())
                }
            }

            if let todayWord = model.todayWord {
                NativeCard {
                    NativeSectionLabel(text: "Today's word")

                    Text(todayWord.title)
                        .font(.system(size: 28, weight: .semibold, design: .serif))

                    Text(todayWord.devilDefinition.trimmingCharacters(in: .whitespacesAndNewlines))
                        .font(.system(size: 17, weight: .medium, design: .rounded))

                    Text(todayWord.plainDefinition.trimmingCharacters(in: .whitespacesAndNewlines))
                        .font(.system(size: 15, weight: .regular, design: .rounded))
                        .foregroundStyle(NativePalette.mutedText)

                    Text("Shared daily across the site, this app, and the watch companion.")
                        .font(.system(size: 13, weight: .medium, design: .rounded))
                        .foregroundStyle(NativePalette.mutedText)

                    if let warningLabel = todayWord.warningLabel {
                        Text(warningLabel)
                            .font(.system(size: 14, weight: .medium, design: .rounded))
                            .foregroundStyle(NativePalette.warning)
                            .padding(14)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(NativePalette.warning.opacity(0.10), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                    }

                    HStack {
                        Button("Read today's word") {
                            model.openTodayWord()
                        }
                        .buttonStyle(NativePrimaryButtonStyle())

                        Button("Random entry") {
                            model.openRandomEntry()
                        }
                        .buttonStyle(NativeSecondaryButtonStyle())
                    }

                    if let shareURL = model.shareURL(for: todayWord) {
                        NativeShareButton(
                            url: shareURL,
                            subject: todayWord.title,
                            message: "Read \(todayWord.title) in The Devil's AI Dictionary."
                        )
                    }

                    if model.shouldShowPushPrompt {
                        Divider()

                        Text(model.pushStatusMessage)
                            .font(.system(size: 14, weight: .regular, design: .rounded))
                            .foregroundStyle(NativePalette.mutedText)

                        Button(model.pushPermissionButtonTitle) {
                            Task {
                                await model.handlePushPermissionAction()
                            }
                        }
                        .buttonStyle(NativeSecondaryButtonStyle())

                        if let actionError = model.actionError {
                            Text(actionError)
                                .font(.system(size: 13, weight: .medium, design: .rounded))
                                .foregroundStyle(NativePalette.warning)
                        }
                    }
                }
            }

            if let featuredEntry = model.featuredEntry {
                VStack(alignment: .leading, spacing: 12) {
                    NativeSectionLabel(text: "Featured")
                    NativeEntryCard(entry: featuredEntry) {
                        model.presentEntry(featuredEntry)
                    }
                }
            }

            if !model.categoryStats.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    NativeSectionLabel(text: "Categories")

                    LazyVGrid(columns: layout.cardGridItems, spacing: 12) {
                        ForEach(model.categoryStats, id: \.slug) { category in
                            Button {
                                model.showBrowse(categorySlug: category.slug)
                            } label: {
                                NativeCard {
                                    Text(category.title)
                                        .font(.system(size: 18, weight: .semibold, design: .serif))
                                        .multilineTextAlignment(.leading)

                                    Text(category.description)
                                        .font(.system(size: 14, weight: .regular, design: .rounded))
                                        .foregroundStyle(NativePalette.mutedText)
                                        .multilineTextAlignment(.leading)

                                    Text("\(category.count) terms")
                                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                                        .foregroundStyle(NativePalette.accent)
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }

            if !model.recentEntries.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    NativeSectionLabel(text: "Recently added")

                    if let latestPublishedAt = model.latestPublishedAt {
                        NativeLatestWordsAddedText(value: latestPublishedAt)
                    }

                    LazyVGrid(columns: layout.cardGridItems, alignment: .leading, spacing: 12) {
                        ForEach(model.recentEntries, id: \.slug) { entry in
                            NativeEntryCard(entry: entry, compact: true) {
                                model.presentEntry(entry)
                            }
                        }
                    }
                }
            }

            if !model.misunderstoodEntries.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    NativeSectionLabel(text: "Most misunderstood")

                    LazyVGrid(columns: layout.cardGridItems, alignment: .leading, spacing: 12) {
                        ForEach(model.misunderstoodEntries, id: \.slug) { entry in
                            NativeEntryCard(entry: entry, compact: true) {
                                model.presentEntry(entry)
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("Home")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            NativeOverflowToolbar(model: model, themeManager: .shared)
        }
    }
}

private struct NativeBrowseView: View {
    @ObservedObject var model: NativeDictionaryModel

    var body: some View {
        NativeScreen { layout in
            NativeCard {
                NativeSectionLabel(text: "Browse")

                Text("Walk the catalogue by letter or narrow it to one category.")
                    .font(.system(size: 17, weight: .medium, design: .rounded))

                if let latestPublishedAt = model.latestPublishedAt {
                    NativeLatestWordsAddedText(value: latestPublishedAt)
                }

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        Button("All letters") {
                            model.browseLetter = nil
                        }
                        .buttonStyle(NativeFilterChipButtonStyle(isSelected: model.browseLetter == nil))

                        ForEach(model.letterOptions, id: \.self) { letter in
                            Button(letter) {
                                model.browseLetter = letter
                            }
                            .buttonStyle(NativeFilterChipButtonStyle(isSelected: model.browseLetter == letter))
                        }
                    }
                }

                Menu {
                    Button("All categories") {
                        model.browseCategorySlug = nil
                    }

                    ForEach(model.categoryStats, id: \.slug) { category in
                        Button(category.title) {
                            model.browseCategorySlug = category.slug
                        }
                    }
                } label: {
                    HStack {
                        Text(model.categoryStats.first(where: { $0.slug == model.browseCategorySlug })?.title ?? "All categories")
                        Spacer()
                        Image(systemName: "chevron.down")
                    }
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .padding(14)
                    .background(NativePalette.panelStrong, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
                .foregroundStyle(.primary)

                if model.browseCategorySlug != nil || model.browseLetter != nil {
                    Button("Clear browse filters") {
                        model.browseLetter = nil
                        model.browseCategorySlug = nil
                    }
                    .buttonStyle(NativeSecondaryButtonStyle())
                }
            }

            if model.browseSections.isEmpty {
                NativeCard {
                    Text("Nothing matched that combination of letter and category.")
                        .font(.system(size: 16, weight: .medium, design: .rounded))

                    Button("Show the full catalogue") {
                        model.browseLetter = nil
                        model.browseCategorySlug = nil
                    }
                    .buttonStyle(NativePrimaryButtonStyle())
                }
            } else {
                ForEach(model.browseSections) { section in
                    VStack(alignment: .leading, spacing: 12) {
                        NativeSectionLabel(text: section.title)

                        LazyVGrid(columns: layout.cardGridItems, alignment: .leading, spacing: 12) {
                            ForEach(section.entries, id: \.slug) { entry in
                                NativeEntryCard(entry: entry, compact: true) {
                                    model.presentEntry(entry)
                                }
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("Browse")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            NativeOverflowToolbar(model: model, themeManager: .shared)
        }
    }
}

private struct NativeLatestWordsAddedText: View {
    let value: String

    var body: some View {
        Text("Last words added \(nativeFormattedDate(value))")
            .font(.system(size: 13, weight: .medium, design: .rounded))
            .foregroundStyle(NativePalette.mutedText)
    }
}

private struct NativeSearchView: View {
    @ObservedObject var model: NativeDictionaryModel
    @State private var showFilters = false

    var body: some View {
        NativeScreen { layout in
            NativeCard {
                NativeSectionLabel(text: "Search")

                Text("Search is local and plain. No mystical reranking, no semantic sermon, just the terms and their actual words.")
                    .font(.system(size: 17, weight: .medium, design: .rounded))

                HStack {
                    Text("\(model.searchResults.count) results")
                        .font(.system(size: 14, weight: .semibold, design: .rounded))
                        .foregroundStyle(NativePalette.accent)

                    Spacer()

                    Button(model.hasSearchFilters ? "Filters on" : "Filters") {
                        showFilters = true
                    }
                    .buttonStyle(NativeSecondaryButtonStyle())
                }
            }

            if model.searchResults.isEmpty {
                NativeCard {
                    Text("Nothing matched the current query.")
                        .font(.system(size: 17, weight: .semibold, design: .rounded))

                    Button("Clear filters") {
                        model.searchQuery = ""
                        model.resetSearchFilters()
                    }
                    .buttonStyle(NativePrimaryButtonStyle())
                }
            } else {
                LazyVGrid(columns: layout.cardGridItems, alignment: .leading, spacing: 12) {
                    ForEach(model.searchResults, id: \.slug) { entry in
                        NativeEntryCard(entry: entry, compact: true) {
                            model.presentEntry(entry)
                        }
                    }
                }
            }
        }
        .navigationTitle("Search")
        .navigationBarTitleDisplayMode(.large)
        .searchable(text: $model.searchQuery, placement: .navigationBarDrawer(displayMode: .always), prompt: "Look up the phrase before it colonises the meeting")
        .toolbar {
            NativeOverflowToolbar(model: model, themeManager: .shared)
        }
        .sheet(isPresented: $showFilters) {
            NavigationView {
                NativeSearchFiltersView(model: model)
            }
            .navigationViewStyle(.stack)
        }
    }
}

private struct NativeSavedView: View {
    @ObservedObject var model: NativeDictionaryModel

    var body: some View {
        NativeScreen { _ in
            NativeCard {
                NativeSectionLabel(text: "Saved")

                Text("Saved places live on this device. Less cloud romance. Better continuity when you are moving between meetings.")
                    .font(.system(size: 17, weight: .medium, design: .rounded))
            }

            if let savedPlace = model.savedPlace {
                NativeCard(emphasis: true) {
                    Text(savedPlace.title)
                        .font(.system(size: 30, weight: .semibold, design: .serif))

                    Text(savedPlace.label)
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundStyle(NativePalette.accent)

                    if let description = savedPlace.description {
                        Text(description)
                            .font(.system(size: 15, weight: .regular, design: .rounded))
                            .foregroundStyle(NativePalette.mutedText)
                    }

                    Text("Saved \(nativeFormattedDate(savedPlace.savedAt))")
                        .font(.system(size: 13, weight: .regular, design: .rounded))
                        .foregroundStyle(NativePalette.mutedText)

                    HStack {
                        Button("Open saved place") {
                            model.openSavedPlace()
                        }
                        .buttonStyle(NativePrimaryButtonStyle())

                        Button("Clear") {
                            model.clearSavedPlace()
                        }
                        .buttonStyle(NativeSecondaryButtonStyle())
                    }
                }

                if let savedEntry = model.savedEntry {
                    NativeEntryCard(entry: savedEntry, compact: true) {
                        model.presentEntry(savedEntry)
                    }
                }
            } else {
                NativeCard {
                    Text("Nothing saved yet.")
                        .font(.system(size: 20, weight: .semibold, design: .serif))

                    Text("Save a place while you read. The app keeps one local bookmark, which is modest but reliable.")
                        .font(.system(size: 15, weight: .regular, design: .rounded))
                        .foregroundStyle(NativePalette.mutedText)

                    HStack {
                        Button("Browse entries") {
                            model.selectedTab = .browse
                        }
                        .buttonStyle(NativePrimaryButtonStyle())

                        Button("Search") {
                            model.selectedTab = .search
                        }
                        .buttonStyle(NativeSecondaryButtonStyle())
                    }
                }
            }
        }
        .navigationTitle("Saved")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            NativeOverflowToolbar(model: model, themeManager: .shared)
        }
    }
}

private struct NativeSettingsView: View {
    @ObservedObject var model: NativeDictionaryModel
    @State private var testingSlug = ""

    var body: some View {
        NativeScreen { _ in
            NativeCard(emphasis: true) {
                NativeSectionLabel(text: "Internal testing")

                Text("Use this page to compare the on-device catalogue with production, force a sync when editorial publishes a new word, and exercise the same slug-routing path used by links and push taps.")
                    .font(.system(size: 17, weight: .medium, design: .rounded))

                HStack {
                    NativeChip(label: "Apple \(model.appVersionLabel)", tone: .accent)

                    if model.isRefreshingCatalog {
                        NativeChip(label: "Syncing now", tone: .accent)
                    } else if model.isCheckingLiveCatalog {
                        NativeChip(label: "Checking live site", tone: .accent)
                    } else if let matchesLive = model.liveCatalogMatchesDevice {
                        NativeChip(
                            label: matchesLive ? "Live site matches" : "Live site differs",
                            tone: matchesLive ? .success : .warning
                        )
                    }
                }
            }

            NativeCard {
                NativeSectionLabel(text: "Live catalogue")

                Text(model.liveCatalogStatusMessage)
                    .font(.system(size: 15, weight: .regular, design: .rounded))
                    .foregroundStyle(model.liveCatalogError == nil ? .primary : NativePalette.warning)

                NativeSettingsValueRow(label: "Website", value: model.siteBaseURLString)
                NativeSettingsValueRow(label: "Manifest", value: model.catalogManifestURLString)
                if let bundledCatalogVersion = model.bundledCatalogVersion {
                    NativeSettingsValueRow(label: "Bundled version", value: bundledCatalogVersion)
                }
                NativeSettingsValueRow(label: "On-device version", value: model.catalogVersion ?? "Unavailable")
                NativeSettingsValueRow(label: "On-device entries", value: "\(model.deviceEntryCount)")

                if let latestPublishedAt = model.latestPublishedAt {
                    NativeSettingsValueRow(
                        label: "On-device latest word",
                        value: nativeFormattedDate(latestPublishedAt)
                    )
                }

                if let lastCatalogCheckAt = model.lastCatalogCheckAt {
                    NativeSettingsValueRow(
                        label: "Last OTA check",
                        value: nativeFormattedDate(lastCatalogCheckAt)
                    )
                }

                if let liveCatalogManifest = model.liveCatalogManifest {
                    NativeSettingsValueRow(label: "Live version", value: liveCatalogManifest.catalogVersion)
                    NativeSettingsValueRow(label: "Live entries", value: "\(liveCatalogManifest.entryCount)")
                    NativeSettingsValueRow(
                        label: "Live latest word",
                        value: nativeFormattedDate(liveCatalogManifest.latestPublishedAt)
                    )
                    NativeSettingsValueRow(
                        label: "Live manifest published",
                        value: nativeFormattedDate(liveCatalogManifest.publishedAt)
                    )
                }

                if let liveCatalogCheckedAt = model.liveCatalogCheckedAt {
                    NativeSettingsValueRow(
                        label: "Checked production",
                        value: nativeFormattedDate(liveCatalogCheckedAt)
                    )
                }

                HStack {
                    Button("Check live site") {
                        Task {
                            await model.checkLiveCatalog()
                        }
                    }
                    .buttonStyle(NativePrimaryButtonStyle())

                    Button("Sync now") {
                        Task {
                            await model.syncCatalogNow()
                        }
                    }
                    .buttonStyle(NativeSecondaryButtonStyle())
                }

                HStack {
                    if let websiteURL = URL(string: model.siteBaseURLString) {
                        Link("Open website", destination: websiteURL)
                            .font(.system(size: 15, weight: .semibold, design: .rounded))
                            .foregroundStyle(NativePalette.accent)
                    }

                    if let manifestURL = URL(string: model.catalogManifestURLString) {
                        Link("Open manifest", destination: manifestURL)
                            .font(.system(size: 15, weight: .semibold, design: .rounded))
                            .foregroundStyle(NativePalette.accent)
                    }
                }
            }

            NativeCard {
                NativeSectionLabel(text: "Notifications and links")

                NativeSettingsValueRow(label: "Push permission", value: model.pushAuthorizationStatus)
                NativeSettingsValueRow(label: "Push token", value: model.pushTokenAvailable ? "Available" : "Missing")

                Text(model.pushStatusMessage)
                    .font(.system(size: 15, weight: .regular, design: .rounded))

                Text(model.pushTokenStatusMessage)
                    .font(.system(size: 14, weight: .regular, design: .rounded))
                    .foregroundStyle(NativePalette.mutedText)

                Button(model.pushPermissionButtonTitle) {
                    Task {
                        await model.handlePushPermissionAction()
                    }
                }
                .buttonStyle(NativeSecondaryButtonStyle())

                NativeSettingsTextField(
                    title: "Testing slug",
                    placeholder: "new-word-slug",
                    text: $testingSlug
                )

                Text("Both buttons below exercise the slug-resolution path that should refresh once when production has a newer catalogue.")
                    .font(.system(size: 14, weight: .regular, design: .rounded))
                    .foregroundStyle(NativePalette.mutedText)

                HStack {
                    Button("Use suggested slug") {
                        testingSlug = model.suggestedTestSlug ?? testingSlug
                    }
                    .buttonStyle(NativeSecondaryButtonStyle())

                    Button("Test deep link") {
                        model.simulateDeepLink(slug: testingSlug)
                    }
                    .buttonStyle(NativePrimaryButtonStyle())

                    Button("Simulate push tap") {
                        Task {
                            await model.simulateNotification(slug: testingSlug)
                        }
                    }
                    .buttonStyle(NativeSecondaryButtonStyle())
                }

                if let actionError = model.actionError {
                    Text(actionError)
                        .font(.system(size: 13, weight: .medium, design: .rounded))
                        .foregroundStyle(NativePalette.warning)
                }
            }
        }
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            NativeOverflowToolbar(model: model, themeManager: .shared)
        }
        .task {
            if testingSlug.isEmpty {
                testingSlug = model.suggestedTestSlug ?? ""
            }
            await model.checkLiveCatalogIfNeeded()
        }
    }
}

private struct NativeSettingsValueRow: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                .textCase(.uppercase)
                .foregroundStyle(NativePalette.mutedText)

            Text(value)
                .font(.system(size: 15, weight: .regular, design: .rounded))
                .textSelection(.enabled)
        }
    }
}

private struct NativeSettingsTextField: View {
    let title: String
    let placeholder: String
    @Binding var text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                .textCase(.uppercase)
                .foregroundStyle(NativePalette.mutedText)

            TextField(placeholder, text: $text)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .font(.system(size: 15, weight: .regular, design: .rounded))
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .background(NativePalette.panelStrong, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(NativePalette.border, lineWidth: 1)
                )
        }
    }
}

private struct NativeSearchFiltersView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var model: NativeDictionaryModel

    var body: some View {
        Form {
            Section("Category") {
                Picker("Category", selection: Binding(
                    get: { model.searchCategorySlug ?? "" },
                    set: { value in
                        model.searchCategorySlug = value.isEmpty ? nil : value
                    }
                )) {
                    Text("All categories").tag("")
                    ForEach(model.categoryStats, id: \.slug) { category in
                        Text(category.title).tag(category.slug)
                    }
                }
            }

            Section("Difficulty") {
                Picker("Difficulty", selection: Binding(
                    get: { model.searchDifficulty?.rawValue ?? "" },
                    set: { value in
                        model.searchDifficulty = value.isEmpty ? nil : Difficulty(rawValue: value)
                    }
                )) {
                    Text("All difficulty levels").tag("")
                    Text("Beginner").tag(Difficulty.beginner.rawValue)
                    Text("Intermediate").tag(Difficulty.intermediate.rawValue)
                    Text("Advanced").tag(Difficulty.advanced.rawValue)
                }
            }

            Section("Technical depth") {
                Picker("Technical depth", selection: Binding(
                    get: { model.searchTechnicalDepth?.rawValue ?? "" },
                    set: { value in
                        model.searchTechnicalDepth = value.isEmpty ? nil : TechnicalDepth(rawValue: value)
                    }
                )) {
                    Text("All depth levels").tag("")
                    Text("Light").tag(TechnicalDepth.low.rawValue)
                    Text("Practical").tag(TechnicalDepth.medium.rawValue)
                    Text("Deep").tag(TechnicalDepth.high.rawValue)
                }
            }

            Section("Vendor language") {
                Picker("Vendor filter", selection: $model.searchVendorFilter) {
                    Text("Show everything").tag(VendorFilter.all)
                    Text("Vendor terms only").tag(VendorFilter.vendorOnly)
                    Text("Non-vendor only").tag(VendorFilter.nonVendorOnly)
                }
            }

            Section {
                Button("Reset filters") {
                    model.resetSearchFilters()
                }
                .foregroundStyle(NativePalette.warning)
            }
        }
        .navigationTitle("Search filters")
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Done") {
                    dismiss()
                }
            }
        }
    }
}

private struct NativeBookView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var model: NativeDictionaryModel

    private var featuredStartPoints: [Entry] {
        ["ai-psychosis", "inference", "openai", "agentic-ai", "rag", "structured-outputs"]
            .compactMap(model.entry(slug:))
    }

    var body: some View {
        NativeScreen { layout in
            NativeCard(emphasis: true) {
                NativeSectionLabel(text: "Book")
                Text("A field guide for people already in the room")
                    .font(.system(size: 34, weight: .bold, design: .serif))

                Text("The dictionary has two jobs. First, to expose inflated language before it hardens into received wisdom. Second, to make the useful distinctions visible: model versus product, retrieval versus memory, structure versus theatre, evaluation versus vibes.")
                    .font(.system(size: 17, weight: .medium, design: .rounded))

                Text("The entries are short on purpose. If a concept cannot survive plain English, it usually needs less reverence, not more slideware.")
                    .font(.system(size: 15, weight: .regular, design: .rounded))
                    .foregroundStyle(NativePalette.mutedText)

                HStack {
                    Button("Save this page") {
                        model.saveBook()
                    }
                    .buttonStyle(NativePrimaryButtonStyle())

                    Button("Browse entries") {
                        dismiss()
                        model.selectedTab = .browse
                    }
                    .buttonStyle(NativeSecondaryButtonStyle())
                }
            }

            NativeCard {
                NativeSectionLabel(text: "How this book reads")

                VStack(alignment: .leading, spacing: 10) {
                    Text("Devil's definition: the memorable line that punctures fog quickly.")
                    Text("Straight definition: the technically serious part, useful when you need the room to stop improvising.")
                    Text("What to ask next: the questions that turn slogans back into concrete claims.")
                }
                .font(.system(size: 15, weight: .regular, design: .rounded))
                .foregroundStyle(NativePalette.mutedText)
            }

            VStack(alignment: .leading, spacing: 12) {
                NativeSectionLabel(text: "Good places to start")

                LazyVGrid(columns: layout.cardGridItems, alignment: .leading, spacing: 12) {
                    ForEach(featuredStartPoints, id: \.slug) { entry in
                        NativeEntryCard(entry: entry, compact: true) {
                            model.presentEntry(entry)
                        }
                    }
                }
            }
        }
        .navigationTitle("Book")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Done") {
                    dismiss()
                }
            }
        }
    }
}

private struct NativeGuideView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NativeScreen { _ in
            NativeCard(emphasis: true) {
                NativeSectionLabel(text: "Guide")
                Text("How to read this dictionary")
                    .font(.system(size: 34, weight: .bold, design: .serif))

                Text("Think of each entry as a small trap for inflated language. It opens with the joke, then closes on the actual meaning.")
                    .font(.system(size: 17, weight: .medium, design: .rounded))
            }

            NativeCard {
                NativeSectionLabel(text: "The structure")

                VStack(alignment: .leading, spacing: 10) {
                    Text("Devil's definition: the sharp line that captures the social function of the term.")
                    Text("Straight definition: the clean technical or practical meaning.")
                    Text("How people abuse the term: the ways it gets stretched, laundered, or used as camouflage.")
                    Text("What to ask next: the questions that convert slogans back into claims you can test.")
                }
                .font(.system(size: 15, weight: .regular, design: .rounded))
                .foregroundStyle(NativePalette.mutedText)
            }

            NativeCard {
                NativeSectionLabel(text: "The labels")

                VStack(alignment: .leading, spacing: 10) {
                    Text("Difficulty tracks assumed familiarity, not status.")
                    Text("Technical depth tells you how far into the mechanics the entry goes.")
                    Text("Hype level signals how often the term turns into fog machine rather than explanation.")
                    Text("Warning labels appear when a term is especially abused, especially vague, or mostly marketing.")
                }
                .font(.system(size: 15, weight: .regular, design: .rounded))
                .foregroundStyle(NativePalette.mutedText)
            }
        }
        .navigationTitle("Guide")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Done") {
                    dismiss()
                }
            }
        }
    }
}

private struct NativeAboutView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var model: NativeDictionaryModel

    var body: some View {
        NativeScreen { layout in
            NativeCard(emphasis: true) {
                NativeSectionLabel(text: "About")
                Text("About this book")
                    .font(.system(size: 34, weight: .bold, design: .serif))

                Text("The project is for readers who already hear AI jargon daily and would like some of it translated back into English before it damages a strategy deck.")
                    .font(.system(size: 17, weight: .medium, design: .rounded))
            }

            NativeCard {
                Text("The editorial voice is dry on purpose. AI language is often inflated long before it is clarified. A little wit helps puncture that inflation without collapsing into cynicism or boosterism.")
                    .font(.system(size: 15, weight: .regular, design: .rounded))

                Text("The book is not anti-technology, anti-start-up, or anti-ambition. It is against terminology doing more work than the systems themselves. If a phrase has a legitimate technical meaning, the entry treats it seriously. If it is mostly branding, the entry says so.")
                    .font(.system(size: 15, weight: .regular, design: .rounded))
                    .foregroundStyle(NativePalette.mutedText)

                if let chatGPT = model.entry(slug: "chatgpt"), let codex = model.entry(slug: "codex") {
                    VStack(alignment: .leading, spacing: 12) {
                        NativeSectionLabel(text: "Co-authors")

                        LazyVGrid(columns: layout.cardGridItems, alignment: .leading, spacing: 12) {
                            NativeEntryCard(entry: chatGPT, compact: true) {
                                model.presentEntry(chatGPT)
                            }

                            NativeEntryCard(entry: codex, compact: true) {
                                model.presentEntry(codex)
                            }
                        }
                    }
                }

                Link("Open the public repository", destination: URL(string: "https://github.com/DJNgoma/the-devils-ai-dictionary")!)
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundStyle(NativePalette.accent)
            }
        }
        .navigationTitle("About")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Done") {
                    dismiss()
                }
            }
        }
    }
}

private struct NativeMissingEntryView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NativeScreen { _ in
            NativeCard {
                Text("That entry is missing from the bundled catalogue.")
                    .font(.system(size: 22, weight: .semibold, design: .serif))

                Text("The app received a route for a term that is not in this local snapshot. Refresh the content index in the repo and rebuild the app if this keeps happening.")
                    .font(.system(size: 15, weight: .regular, design: .rounded))
                    .foregroundStyle(NativePalette.mutedText)
            }
        }
        .navigationTitle("Missing entry")
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Done") {
                    dismiss()
                }
            }
        }
    }
}

private struct NativeOverflowToolbar: ToolbarContent {
    @ObservedObject var model: NativeDictionaryModel
    @ObservedObject var themeManager: ThemeManager

    var body: some ToolbarContent {
        ToolbarItem(placement: .navigationBarTrailing) {
            Menu {
                Button("Read the book") {
                    model.presentBook()
                }

                Button("How to read") {
                    model.presentGuide()
                }

                Button("About") {
                    model.presentAbout()
                }

                Button("Random entry") {
                    model.openRandomEntry()
                }

                Divider()

                Picker(selection: Binding(
                    get: { themeManager.current },
                    set: { themeManager.setTheme($0) }
                )) {
                    ForEach(SiteTheme.allCases) { theme in
                        Label {
                            Text(theme.label)
                        } icon: {
                            Image(systemName: theme == .night ? "moon" : "paintpalette")
                        }
                        .tag(theme)
                    }
                } label: {
                    Label("Theme", systemImage: "paintpalette")
                }
            } label: {
                Image(systemName: "ellipsis.circle")
                    .foregroundStyle(NativePalette.accent)
            }
        }
    }
}

struct NativeFilterChipButtonStyle: ButtonStyle {
    var isSelected: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 13, weight: .semibold, design: .rounded))
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(background(configuration: configuration), in: Capsule())
            .overlay(
                Capsule()
                    .stroke(border, lineWidth: 1)
            )
            .foregroundStyle(isSelected ? NativePalette.accent : .primary)
    }

    private func background(configuration: Configuration) -> Color {
        if isSelected {
            return NativePalette.accentMuted.opacity(configuration.isPressed ? 0.85 : 1)
        }

        return NativePalette.panelStrong.opacity(configuration.isPressed ? 0.85 : 1)
    }

    private var border: Color {
        isSelected ? NativePalette.accent.opacity(0.24) : NativePalette.border
    }
}
