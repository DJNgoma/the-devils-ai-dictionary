import Foundation
import SwiftUI

#if os(iOS)
import AuthenticationServices
#endif

#if canImport(DevilsAIDictionaryCore)
import DevilsAIDictionaryCore
#endif

enum NativeDeveloperModeAvailability {
    static let storageKey = "developer-mode"
    static let screenshotPresetKey = "developer-screenshot-preset"

    static var isAvailable: Bool {
        #if DEBUG
        return true
        #else
        if Bundle.main.path(forResource: "embedded", ofType: "mobileprovision") != nil {
            return true
        }

        return Bundle.main.appStoreReceiptURL?.lastPathComponent == "sandboxReceipt"
        #endif
    }

    static func isEnabled(storedValue: Bool) -> Bool {
        isAvailable && storedValue
    }

    static func isEnabled(defaults: UserDefaults = .standard) -> Bool {
        if let storedValue = defaults.object(forKey: storageKey) as? Bool {
            return isEnabled(storedValue: storedValue)
        }

        if let storedString = defaults.string(forKey: storageKey) {
            return isEnabled(storedValue: NSString(string: storedString).boolValue)
        }

        return false
    }

    static var shouldSkipSplashForScreenshots: Bool {
        isEnabled() && UserDefaults.standard.string(forKey: screenshotPresetKey) != nil
    }
}

struct NativeDictionaryRootView: View {
    @StateObject private var model: NativeDictionaryModel
    @ObservedObject private var themeManager = ThemeManager.shared
    @Environment(\.colorScheme) private var systemColorScheme

    init(model: NativeDictionaryModel) {
        _model = StateObject(wrappedValue: model)
    }

    var body: some View {
        Group {
            #if os(macOS)
            NativeMacDictionaryRoot(model: model, themeManager: themeManager)
                .tint(NativePalette.accent)
                .id(themeManager.current)
                .preferredColorScheme(themeManager.preferredColorSchemeOverride)
            #else
            NativePhoneDictionaryRoot(model: model)
                .tint(NativePalette.accent)
                .id(themeManager.current)
                .preferredColorScheme(themeManager.preferredColorSchemeOverride)
                .overlay(alignment: .bottom) {
                    NativeSavedToast(model: model)
                }
                .sheet(item: $model.activeSheet) { sheet in
                    NavigationView {
                        switch sheet {
                        case .onboarding:
                            NativeOnboardingGuideView(model: model)
                                .interactiveDismissDisabled()
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
                        case .category(let slug):
                            if let category = model.categoryStats.first(where: { $0.slug == slug }) {
                                NativeCategoryDetailView(model: model, category: category)
                            } else {
                                NativeMissingEntryView()
                            }
                        case .related(let slug):
                            if let entry = model.entry(slug: slug) {
                                NativeRelatedTermsView(model: model, entry: entry)
                            } else {
                                NativeMissingEntryView()
                            }
                        }
                    }
                    .nativeStackNavigationViewStyle()
                }
            #endif
        }
        .onAppear {
            themeManager.updateSystemColorScheme(systemColorScheme)
        }
        .onChange(of: systemColorScheme) { newValue in
            themeManager.updateSystemColorScheme(newValue)
        }
    }
}

private struct NativePhoneDictionaryRoot: View {
    @ObservedObject var model: NativeDictionaryModel

    var body: some View {
        TabView(selection: $model.selectedTab) {
            NavigationView {
                NativeHomeView(model: model)
            }
            .nativeStackNavigationViewStyle()
            .tabItem {
                Label("Home", systemImage: NativeDictionaryModel.AppTab.home.systemImage)
            }
            .tag(NativeDictionaryModel.AppTab.home)

            NavigationView {
                NativeSearchView(model: model)
            }
            .nativeStackNavigationViewStyle()
            .tabItem {
                Label("Search", systemImage: NativeDictionaryModel.AppTab.search.systemImage)
            }
            .tag(NativeDictionaryModel.AppTab.search)

            NavigationView {
                NativeCategoriesView(model: model)
            }
            .nativeStackNavigationViewStyle()
            .tabItem {
                Label("Categories", systemImage: NativeDictionaryModel.AppTab.categories.systemImage)
            }
            .tag(NativeDictionaryModel.AppTab.categories)

            NavigationView {
                NativeSavedView(model: model)
            }
            .nativeStackNavigationViewStyle()
            .tabItem {
                Label("Saved", systemImage: NativeDictionaryModel.AppTab.saved.systemImage)
            }
            .tag(NativeDictionaryModel.AppTab.saved)

            NavigationView {
                NativeSettingsView(model: model)
            }
            .nativeStackNavigationViewStyle()
            .tabItem {
                Label("Settings", systemImage: NativeDictionaryModel.AppTab.settings.systemImage)
            }
            .tag(NativeDictionaryModel.AppTab.settings)
        }
        .onAppear {
            if !NativeDeveloperModeAvailability.isAvailable {
                UserDefaults.standard.set(false, forKey: NativeDeveloperModeAvailability.storageKey)
                UserDefaults.standard.removeObject(forKey: NativeDeveloperModeAvailability.screenshotPresetKey)
            }

            model.syncDeveloperScreenshotModeFromDefaults()
        }
    }
}

private struct NativeOnboardingGuideView: View {
    @ObservedObject var model: NativeDictionaryModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 10) {
                    NativeSectionLabel(text: "Welcome")

                    Text("The Devil's\nAI Dictionary")
                        .font(.system(size: 36, weight: .bold, design: .serif))
                        .lineSpacing(2)

                    Text("A small guide before the jargon starts performing again.")
                        .font(.system(size: 17, weight: .medium, design: .rounded))
                        .foregroundStyle(NativePalette.mutedText)
                }
                .padding(.top, 8)

                VStack(alignment: .leading, spacing: 14) {
                    NativeOnboardingFeatureRow(
                        icon: "house",
                        title: "Start on Home",
                        detail: "Today's word lives there, along with the quickest route into the book and a random detour."
                    )
                    NativeOnboardingFeatureRow(
                        icon: "bookmark",
                        title: "Save words worth keeping",
                        detail: "Save from any entry or the Saved tab. Sign in with Apple to sync across devices."
                    )
                    NativeOnboardingFeatureRow(
                        icon: "bell",
                        title: "Invite the daily word",
                        detail: "Notifications are optional, dry, and scheduled by local hour rather than whim."
                    )
                }
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 24)
        }
        .safeAreaInset(edge: .bottom) {
            VStack(spacing: 10) {
                Button("Start reading") {
                    model.completeOnboarding()
                }
                .buttonStyle(NativePrimaryButtonStyle())
                .frame(maxWidth: .infinity)

                Button("Read the full guide instead") {
                    model.completeOnboarding(openGuide: true)
                }
                .font(.system(size: 14, weight: .medium, design: .rounded))
                .foregroundStyle(NativePalette.mutedText)
            }
            .padding(.horizontal, 24)
            .padding(.top, 14)
            .padding(.bottom, 8)
            .background(
                NativePalette.paper
                    .shadow(color: .black.opacity(0.06), radius: 8, y: -4)
                    .ignoresSafeArea()
            )
        }
        .background(NativePalette.paper.ignoresSafeArea())
        .navigationBarHidden(true)
    }
}

private struct NativeOnboardingFeatureRow: View {
    let icon: String
    let title: String
    let detail: String

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 20, weight: .medium))
                .foregroundStyle(NativePalette.accent)
                .frame(width: 36, height: 36)
                .background(NativePalette.accentMuted.opacity(0.25), in: RoundedRectangle(cornerRadius: 10, style: .continuous))

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                Text(detail)
                    .font(.system(size: 15, weight: .regular, design: .rounded))
                    .foregroundStyle(NativePalette.mutedText)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(NativePalette.panel, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(NativePalette.border, lineWidth: 1)
        )
    }
}

#if os(macOS)
private struct NativeMacDictionaryRoot: View {
    @ObservedObject var model: NativeDictionaryModel
    @ObservedObject var themeManager: ThemeManager

    var body: some View {
        NavigationSplitView {
            NativeMacSidebar(model: model)
                .navigationSplitViewColumnWidth(min: 260, ideal: 286, max: 320)
        } detail: {
            NavigationStack {
                NativeMacDetailView(model: model)
            }
            .frame(minWidth: 760, maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
        .navigationSplitViewStyle(.balanced)
        .toolbar {
            NativeMacToolbar(model: model, themeManager: themeManager)
        }
    }
}

private struct NativeMacSidebar: View {
    @ObservedObject var model: NativeDictionaryModel

    var body: some View {
        ZStack {
            NativePalette.paper.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    VStack(alignment: .leading, spacing: 8) {
                        NativeSectionLabel(text: "Mac edition")

                        Text("The Devil's AI Dictionary")
                            .font(.system(size: 30, weight: .bold, design: .serif))

                        Text("A desktop reading room for inflated AI language, with the bookish theme left intact and the phone chrome quietly removed.")
                            .font(.system(size: 15, weight: .regular, design: .rounded))
                            .foregroundStyle(NativePalette.mutedText)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(NativeDictionaryModel.AppTab.allCases) { section in
                            Button {
                                model.showSection(section)
                            } label: {
                                HStack(spacing: 12) {
                                    Image(systemName: section.systemImage)
                                        .font(.system(size: 14, weight: .semibold))
                                        .frame(width: 18)

                                    Text(section.label)
                                        .font(.system(size: 15, weight: .semibold, design: .rounded))

                                    Spacer(minLength: 12)

                                    if model.macSidebarSelection == section && model.macShowsInlineDetail {
                                        Image(systemName: "arrow.turn.down.right")
                                            .font(.system(size: 12, weight: .semibold))
                                            .foregroundStyle(NativePalette.accent)
                                    }
                                }
                                .padding(.horizontal, 14)
                                .padding(.vertical, 12)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(
                                    model.macSidebarSelection == section ? NativePalette.accentMuted : NativePalette.panel,
                                    in: RoundedRectangle(cornerRadius: 18, style: .continuous)
                                )
                                .overlay(
                                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                                        .stroke(
                                            model.macSidebarSelection == section ? NativePalette.accent.opacity(0.28) : NativePalette.border,
                                            lineWidth: 1
                                        )
                                )
                            }
                            .buttonStyle(.plain)
                            .foregroundStyle(model.macSidebarSelection == section ? NativePalette.accent : .primary)
                        }
                    }

                    NativeCard {
                        NativeSectionLabel(text: "Editorial")

                        Text("The non-tab pages live here now, inline and close to the main reading flow.")
                            .font(.system(size: 14, weight: .regular, design: .rounded))
                            .foregroundStyle(NativePalette.mutedText)

                        VStack(alignment: .leading, spacing: 10) {
                            Button("Read the book") {
                                model.presentBook()
                            }
                            .buttonStyle(.plain)

                            Button("How to read") {
                                model.presentGuide()
                            }
                            .buttonStyle(.plain)

                            Button("About") {
                                model.presentAbout()
                            }
                            .buttonStyle(.plain)
                        }
                        .font(.system(size: 15, weight: .semibold, design: .rounded))
                        .foregroundStyle(NativePalette.accent)
                    }

                    if let todayWord = model.todayWord {
                        NativeCard(emphasis: true) {
                            NativeSectionLabel(text: "Today's word")

                            Text(todayWord.title)
                                .font(.system(size: 24, weight: .semibold, design: .serif))

                            Text(todayWord.devilDefinition.trimmingCharacters(in: .whitespacesAndNewlines))
                                .font(.system(size: 15, weight: .medium, design: .rounded))
                                .lineLimit(4)

                            VStack(alignment: .leading, spacing: 8) {
                                Button("Open today's word") {
                                    model.openTodayWord()
                                }
                                .buttonStyle(NativeSecondaryButtonStyle())

                                SaveConfirmButton(label: "Save word") {
                                    model.save(entry: todayWord)
                                }
                            }
                        }
                    }
                }
                .padding(20)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }
}

private struct NativeMacDetailView: View {
    @ObservedObject var model: NativeDictionaryModel

    var body: some View {
        switch model.macDetailRoute {
        case .section(let section):
            NativeSectionHostView(model: model, section: section)
        case .entry(let slug):
            if let entry = model.entry(slug: slug) {
                NativeEntryDetailView(model: model, entry: entry, showsCloseButton: false)
            } else {
                NativeMissingEntryView(showsCloseButton: false)
            }
        case .book:
            NativeBookView(model: model, showsCloseButton: false)
        case .guide:
            NativeGuideView(showsCloseButton: false)
        case .about:
            NativeAboutView(model: model, showsCloseButton: false)
        }
    }
}

private struct NativeSectionHostView: View {
    @ObservedObject var model: NativeDictionaryModel
    let section: NativeDictionaryModel.AppTab

    var body: some View {
        switch section {
        case .home:
            NativeHomeView(model: model)
        case .search:
            NativeSearchView(model: model)
        case .categories:
            NativeCategoriesView(model: model)
        case .saved:
            NativeSavedView(model: model)
        case .settings:
            NativeSettingsView(model: model)
        }
    }
}

private struct NativeMacToolbar: ToolbarContent {
    @ObservedObject var model: NativeDictionaryModel
    @ObservedObject var themeManager: ThemeManager

    var body: some ToolbarContent {
        ToolbarItemGroup(placement: .navigation) {
            if model.macShowsInlineDetail {
                Button(model.macReturnButtonTitle) {
                    model.returnToMacSection()
                }
            }
        }

        ToolbarItemGroup(placement: .primaryAction) {
            Button {
                model.openRandomEntry()
            } label: {
                Label("Random entry", systemImage: "shuffle")
            }

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

                Divider()

                Toggle(
                    isOn: Binding(
                        get: { themeManager.mode == .auto },
                        set: { themeManager.setMode($0 ? .auto : .manual) }
                    )
                ) {
                    Text("Auto appearance")
                }

                if themeManager.mode == .auto {
                    Button(themeManager.autoSummary) {}
                        .disabled(true)
                } else {
                    Picker(selection: Binding(
                        get: { themeManager.manualSelection },
                        set: { themeManager.setTheme($0) }
                    )) {
                        ForEach(SiteTheme.allCases) { theme in
                            Text(theme.label).tag(theme)
                        }
                    } label: {
                        Text("Theme")
                    }
                }
            } label: {
                Label("Display", systemImage: "paintpalette")
            }
        }
    }
}
#endif

private struct NativeHomeView: View {
    @ObservedObject var model: NativeDictionaryModel
    @AppStorage(NativeDeveloperModeAvailability.storageKey) private var storedDeveloperMode = false

    var body: some View {
        NativeScreen { layout in
            NativeCard(emphasis: true) {
                NativeSectionLabel(text: "Field guide")

                if let latestPublishedAt = model.latestPublishedAt {
                    Text("Updated \(nativeFormattedDate(latestPublishedAt))")
                        .font(.system(size: 13, weight: .medium, design: .rounded))
                        .foregroundStyle(NativePalette.mutedText)
                }

                Text("The Devil's AI Dictionary")
                    .font(.system(size: 34, weight: .bold, design: .serif))

                Text("A sceptical field guide to the language machines, marketers, founders, and consultants use when they want to sound smarter than they are.")
                    .font(.system(size: 18, weight: .medium, design: .rounded))
                    .foregroundStyle(.primary)

                if NativeDeveloperModeAvailability.isEnabled(storedValue: storedDeveloperMode) && !model.isDeveloperScreenshotMode {
                    Text("This is the native Apple edition: bundled content, local search, saved words, deep links, notifications, and watch sync without the webview in the middle pretending to be architecture.")
                        .font(.system(size: 15, weight: .regular, design: .rounded))
                        .foregroundStyle(NativePalette.mutedText)
                }

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

                if model.shouldShowPushPrompt && !model.isDeveloperScreenshotMode {
                    Divider()

                    NativeHeroDailyReminderPrompt(model: model)
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

                    HStack {
                        Button("Open") {
                            model.openTodayWord()
                        }
                        .buttonStyle(NativePrimaryButtonStyle())

                        SaveConfirmButton(label: "Save word") {
                            model.save(entry: todayWord)
                        }

                        if let shareURL = model.shareURL(for: todayWord) {
                            NativeShareButton(
                                url: shareURL,
                                subject: todayWord.title,
                                message: "Read \(todayWord.title) in The Devil's AI Dictionary."
                            )
                        }
                    }
                }
            }

            if !model.glossaryCategoryStats.isEmpty {
                NativeHomeCategoryGroup(
                    title: "Glossary — start here",
                    categories: model.glossaryCategoryStats,
                    layout: layout,
                    model: model,
                )
            }

            if !model.nonGlossaryCategoryStats.isEmpty {
                NativeHomeCategoryGroup(
                    title: "Browse by category",
                    categories: model.nonGlossaryCategoryStats,
                    layout: layout,
                    model: model,
                )
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
        .nativeNavigationBarTitleDisplayMode(.large)
        .refreshable {
            await model.syncCatalogNow()
        }
        .nativeOverflowToolbarIfNeeded(model: model, themeManager: .shared)
    }
}

private struct NativeHeroDailyReminderPrompt: View {
    @ObservedObject var model: NativeDictionaryModel

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(model.homePushPromptTitle)
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .foregroundStyle(.primary)

            Text(model.homePushPromptMessage)
                .font(.system(size: 14, weight: .regular, design: .rounded))
                .foregroundStyle(NativePalette.mutedText)

            if let actionTitle = model.homePushPromptButtonTitle {
                Button(actionTitle) {
                    Task {
                        await model.handlePushPermissionAction()
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
}

private struct NativeHomeCategoryGroup: View {
    let title: String
    let categories: [CategoryStat]
    let layout: NativeScreenLayout
    @ObservedObject var model: NativeDictionaryModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            NativeSectionLabel(text: title)

            LazyVGrid(columns: layout.cardGridItems, spacing: 12) {
                ForEach(categories, id: \.slug) { category in
                    Button {
                        model.presentCategory(category.slug)
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
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

private struct NativeCategoriesView: View {
    @ObservedObject var model: NativeDictionaryModel

    var body: some View {
        NativeScreen { layout in
            NativeCard(emphasis: true) {
                NativeSectionLabel(text: "Categories")

                Text("The catalogue sorted by editorial theme. Each category groups terms by what they have in common, not where they sit in a product.")
                    .font(.system(size: 17, weight: .medium, design: .rounded))
            }

            if !model.glossaryCategoryStats.isEmpty {
                NativeCategoriesSection(
                    title: "Glossary — start here",
                    categories: model.glossaryCategoryStats,
                    layout: layout,
                    model: model,
                )
            }

            if !model.nonGlossaryCategoryStats.isEmpty {
                NativeCategoriesSection(
                    title: "All categories",
                    categories: model.nonGlossaryCategoryStats,
                    layout: layout,
                    model: model,
                )
            }
        }
        .navigationTitle("Categories")
        .nativeNavigationBarTitleDisplayMode(.large)
        .nativeOverflowToolbarIfNeeded(model: model, themeManager: .shared)
    }
}

private struct NativeCategoriesSection: View {
    let title: String
    let categories: [CategoryStat]
    let layout: NativeScreenLayout
    @ObservedObject var model: NativeDictionaryModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            NativeSectionLabel(text: title)

            LazyVGrid(columns: layout.cardGridItems, alignment: .leading, spacing: 12) {
                ForEach(categories, id: \.slug) { category in
                    Button {
                        model.presentCategory(category.slug)
                    } label: {
                        NativeCard {
                            Text(category.title)
                                .font(.system(size: 22, weight: .semibold, design: .serif))

                            Text(category.description)
                                .font(.system(size: 15, weight: .regular, design: .rounded))
                                .foregroundStyle(NativePalette.mutedText)

                            Text("\(category.count) entries")
                                .font(.system(size: 13, weight: .semibold, design: .rounded))
                                .foregroundStyle(NativePalette.accent)
                        }
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
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
            NativeCard(emphasis: true) {
                NativeSectionLabel(text: "Search")

                Text("Search is local and plain. No mystical reranking, no semantic sermon, just the terms and their actual words.")
                    .font(.system(size: 17, weight: .medium, design: .rounded))

                HStack {
                    Text("\(model.searchResults.count) results")
                        .font(.system(size: 14, weight: .semibold, design: .rounded))
                        .foregroundStyle(NativePalette.accent)

                    Spacer()

                    if !model.searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || model.hasSearchFilters {
                        Button("Clear filters") {
                            model.searchQuery = ""
                            model.resetSearchFilters()
                        }
                        .buttonStyle(NativeSecondaryButtonStyle())
                    }

                    Button(model.hasSearchFilters ? "Filters on" : "Filters") {
                        showFilters = true
                    }
                    .buttonStyle(NativeSecondaryButtonStyle())
                    .overlay(alignment: .topTrailing) {
                        if model.hasSearchFilters {
                            Circle()
                                .fill(NativePalette.accent)
                                .frame(width: 8, height: 8)
                                .offset(x: 2, y: -2)
                        }
                    }
                }

                if model.hasSearchFilters {
                    NativeActiveFilterChips(model: model)
                }

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        Button("All letters") {
                            model.searchLetter = nil
                        }
                        .buttonStyle(NativeFilterChipButtonStyle(isSelected: model.searchLetter == nil))

                        ForEach(model.letterOptions, id: \.self) { letter in
                            Button(letter) {
                                model.searchLetter = letter
                            }
                            .buttonStyle(NativeFilterChipButtonStyle(isSelected: model.searchLetter == letter))
                        }
                    }
                }

                if model.searchLetter != nil {
                    Button("Clear letter filter") {
                        model.searchLetter = nil
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
        .nativeNavigationBarTitleDisplayMode(.large)
        .nativeSearchable(
            text: $model.searchQuery,
            prompt: "Look up the phrase before it colonises the meeting"
        )
        .nativeOverflowToolbarIfNeeded(model: model, themeManager: .shared)
        .sheet(isPresented: $showFilters) {
            NavigationView {
                NativeSearchFiltersView(model: model)
            }
            .nativeStackNavigationViewStyle()
        }
    }
}

private struct NativeSavedView: View {
    @ObservedObject var model: NativeDictionaryModel

    var body: some View {
        NativeScreen { _ in
            #if os(iOS)
            NativeCard(emphasis: true) {
                NativeSectionLabel(text: "Saved")

                Text(model.appleSession == nil
                     ? "Saved words live here until you sign in. Less cloud romance, more useful memory."
                     : "Saved words sync through your Apple account. The app keeps its receipts.")
                    .font(.system(size: 17, weight: .medium, design: .rounded))
            }

            if model.savedWords.isEmpty {
                NativeCard {
                    Text("Nothing saved yet.")
                        .font(.system(size: 20, weight: .semibold, design: .serif))

                    Text(model.appleSession == nil
                         ? "Save a word while you read, then sign in to sync it. The app will not pretend a singleton is a strategy."
                         : "Save a word while you read. It will show up here and make a small, useful nuisance of itself.")
                        .font(.system(size: 15, weight: .regular, design: .rounded))
                        .foregroundStyle(NativePalette.mutedText)

                    HStack {
                        Button("Search entries") {
                            model.showSection(.search)
                        }
                        .buttonStyle(NativePrimaryButtonStyle())

                        if model.appleSession == nil {
                            Button("Open Settings") {
                                model.showSection(.settings)
                            }
                            .buttonStyle(NativeSecondaryButtonStyle())
                        } else {
                            Button(model.appleSyncButtonTitle) {
                                Task {
                                    await model.refreshSavedWordsSyncState()
                                }
                            }
                            .buttonStyle(NativeSecondaryButtonStyle())
                            .disabled(model.isRefreshingSavedWordsSync)
                        }
                    }
                }
            } else {
                VStack(alignment: .leading, spacing: 12) {
                    NativeSectionLabel(text: "Saved words")

                    Text(model.appleSyncStatusMessage)
                        .font(.system(size: 15, weight: .regular, design: .rounded))
                        .foregroundStyle(NativePalette.mutedText)

                    if let lastSynced = model.appleLastSyncedLabel {
                        Text("Last synced \(lastSynced).")
                            .font(.system(size: 13, weight: .regular, design: .rounded))
                            .foregroundStyle(NativePalette.mutedText)
                    }

                    ForEach(model.savedWords) { savedWord in
                        NativeCard {
                            HStack(alignment: .top, spacing: 12) {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(savedWord.title)
                                        .font(.system(size: 22, weight: .semibold, design: .serif))

                                    if let description = savedWord.description {
                                        Text(description)
                                            .font(.system(size: 15, weight: .regular, design: .rounded))
                                            .foregroundStyle(NativePalette.mutedText)
                                    }

                                    Text("Saved \(nativeFormattedDate(savedWord.savedAt))")
                                        .font(.system(size: 13, weight: .regular, design: .rounded))
                                        .foregroundStyle(NativePalette.mutedText)
                                }

                                Spacer(minLength: 8)

                                VStack(alignment: .trailing, spacing: 10) {
                                    Button("Open word") {
                                        if let entry = model.entry(slug: savedWord.slug) {
                                            model.presentEntry(entry)
                                        }
                                    }
                                    .buttonStyle(NativeSecondaryButtonStyle())

                                    ConfirmRemoveButton {
                                        model.removeSavedWord(savedWord)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            #else
            NativeCard(emphasis: true) {
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
                        Button("Open word") {
                            model.openSavedPlace()
                        }
                        .buttonStyle(NativePrimaryButtonStyle())

                        ConfirmRemoveButton {
                            model.clearSavedPlace()
                        }
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
                        Button("Search entries") {
                            model.showSection(.search)
                        }
                        .buttonStyle(NativePrimaryButtonStyle())

                        Button("Categories") {
                            model.showSection(.categories)
                        }
                        .buttonStyle(NativeSecondaryButtonStyle())
                    }
                }
            }
            #endif
        }
        .navigationTitle("Saved")
        .nativeNavigationBarTitleDisplayMode(.large)
        .nativeOverflowToolbarIfNeeded(model: model, themeManager: .shared)
    }
}

private struct NativeSettingsView: View {
    @ObservedObject var model: NativeDictionaryModel
    @ObservedObject private var themeManager = ThemeManager.shared
    @AppStorage(NativeDeveloperModeAvailability.storageKey) private var storedDeveloperMode = false
    @State private var testingSlug = ""

    private var developerModeBinding: Binding<Bool> {
        Binding(
            get: { NativeDeveloperModeAvailability.isEnabled(storedValue: storedDeveloperMode) },
            set: {
                let enabled = NativeDeveloperModeAvailability.isAvailable && $0
                storedDeveloperMode = enabled

                if enabled {
                    model.syncDeveloperScreenshotModeFromDefaults()
                } else {
                    model.clearDeveloperScreenshotPreset()
                }
            }
        )
    }

    private var notificationsBinding: Binding<Bool> {
        Binding(
            get: { model.pushNotificationsPreferenceEnabled },
            set: { enabled in
                Task {
                    await model.setPushNotificationsEnabled(enabled)
                }
            }
        )
    }

    private var autoAppearanceBinding: Binding<Bool> {
        Binding(
            get: { themeManager.mode == .auto },
            set: { enabled in
                themeManager.setMode(enabled ? .auto : .manual)
            }
        )
    }

    var body: some View {
        NativeScreen { _ in
            NativeCard(emphasis: true) {
                NativeSectionLabel(text: "Appearance")

                Text("Auto keeps to Book in light mode and Night after dark. Turn it off if this device deserves a more opinionated edition.")
                    .font(.system(size: 15, weight: .regular, design: .rounded))
                    .foregroundStyle(NativePalette.mutedText)

                Toggle("Auto appearance", isOn: autoAppearanceBinding)
                    .font(.system(size: 17, weight: .medium, design: .rounded))
                    .tint(NativePalette.accent)

                if themeManager.mode == .auto {
                    Text("Currently using \(themeManager.current.label), because this device is in \(themeManager.currentModeLabel) appearance.")
                        .font(.system(size: 15, weight: .regular, design: .rounded))
                        .foregroundStyle(NativePalette.mutedText)
                } else {
                    ForEach(ThemeAppearanceGroup.allCases) { appearance in
                        VStack(alignment: .leading, spacing: 8) {
                            NativeSectionLabel(text: appearance.label)

                            ForEach(SiteTheme.allCases.filter { $0.appearanceGroup == appearance }) { theme in
                                Button {
                                    themeManager.setTheme(theme)
                                } label: {
                                    HStack {
                                        let (s1, s2, s3) = theme.swatches
                                        HStack(spacing: 4) {
                                            Circle()
                                                .fill(s1)
                                                .overlay(Circle().stroke(Color.black, lineWidth: 1))
                                                .frame(width: 14, height: 14)
                                            Circle()
                                                .fill(s2)
                                                .overlay(Circle().stroke(Color.black, lineWidth: 1))
                                                .frame(width: 14, height: 14)
                                            Circle()
                                                .fill(s3)
                                                .overlay(Circle().stroke(Color.black, lineWidth: 1))
                                                .frame(width: 14, height: 14)
                                        }
                                        Text(theme.label)
                                            .font(.system(size: 17, weight: .medium, design: .rounded))
                                        Spacer()
                                        if theme == themeManager.manualSelection {
                                            Image(systemName: "checkmark")
                                                .foregroundStyle(NativePalette.accent)
                                        }
                                    }
                                    .padding(.vertical, 8)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .contentShape(Rectangle())
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
            }

            NativeCard {
                NativeSectionLabel(text: "Notifications")

                Toggle("Daily word notifications", isOn: notificationsBinding)
                    .font(.system(size: 17, weight: .medium, design: .rounded))
                    .tint(NativePalette.accent)
                    .disabled(model.pushAuthorizationStatus == "unsupported")

                NativeSettingsHourPicker(
                    title: "Delivery hour",
                    selectionLabel: model.pushPreferredDeliveryHourLabel,
                    selection: model.pushPreferredDeliveryHour,
                    enabled: model.pushAuthorizationStatus != "unsupported"
                ) { hour in
                    Task {
                        await model.setPushPreferredDeliveryHour(hour)
                    }
                }

                Text("Local time on this device. The phone queues the next 60 daily words itself, so delivery is no longer waiting on a server cron.")
                    .font(.system(size: 14, weight: .regular, design: .rounded))
                    .foregroundStyle(NativePalette.mutedText)

                Text(model.pushStatusMessage)
                    .font(.system(size: 15, weight: .regular, design: .rounded))
                    .foregroundStyle(NativePalette.mutedText)

                if model.shouldShowPushPrompt {
                    Button(model.pushPermissionButtonTitle) {
                        Task {
                            await model.handlePushPermissionAction()
                        }
                    }
                    .buttonStyle(NativeSecondaryButtonStyle())
                }
            }

            #if os(iOS)
            NativeCard {
                NativeSectionLabel(text: "Account")

                Text(model.appleAccountStatusMessage)
                    .font(.system(size: 15, weight: .regular, design: .rounded))
                    .foregroundStyle(NativePalette.mutedText)

                Text(model.appleSyncStatusMessage)
                    .font(.system(size: 14, weight: .regular, design: .rounded))
                    .foregroundStyle(NativePalette.mutedText)

                if let lastSynced = model.appleLastSyncedLabel {
                    Text("Last synced \(lastSynced).")
                        .font(.system(size: 13, weight: .regular, design: .rounded))
                        .foregroundStyle(NativePalette.mutedText)
                }

                if model.isAppleAccountSignedIn {
                    HStack {
                        Button(model.appleSyncButtonTitle) {
                            Task {
                                await model.refreshSavedWordsSyncState()
                            }
                        }
                        .buttonStyle(NativePrimaryButtonStyle())
                        .disabled(model.isRefreshingSavedWordsSync)

                        Button("Sign out") {
                            Task {
                                await model.signOutOfApple()
                            }
                        }
                        .buttonStyle(NativeSecondaryButtonStyle())
                        .disabled(model.isRefreshingSavedWordsSync)
                    }
                } else {
                    SignInWithAppleButton(.signIn, onRequest: { request in
                        request.requestedScopes = [.fullName, .email]
                    }, onCompletion: { result in
                        Task {
                            await model.handleAppleSignIn(result)
                        }
                    })
                    .signInWithAppleButtonStyle(.black)
                    .frame(maxWidth: .infinity, minHeight: 44)
                }
            }
            #endif

            if model.canReviewApp {
                NativeCard {
                    NativeSectionLabel(text: "Review")

                    Text(model.reviewStatusMessage)
                        .font(.system(size: 15, weight: .regular, design: .rounded))
                        .foregroundStyle(NativePalette.mutedText)

                    Button(model.reviewActionTitle) {
                        model.openAppReviewPage()
                    }
                    .buttonStyle(NativeSecondaryButtonStyle())
                }
            }

            if NativeDeveloperModeAvailability.isAvailable {
                NativeCard {
                    NativeSectionLabel(text: "Developer")

                    Toggle("Developer mode", isOn: developerModeBinding)
                        .font(.system(size: 17, weight: .medium, design: .rounded))
                        .tint(NativePalette.accent)
                }
            }

            if NativeDeveloperModeAvailability.isEnabled(storedValue: storedDeveloperMode) {
            NativeCard {
                NativeSectionLabel(text: "ASO screenshots")

                Text("Stage clean App Store capture states from developer mode. The preset suppresses the splash screen and overflow menu until you clear it.")
                    .font(.system(size: 15, weight: .regular, design: .rounded))
                    .foregroundStyle(NativePalette.mutedText)

                if let preset = model.developerScreenshotPreset {
                    NativeChip(label: "Current preset: \(preset.label)", tone: .accent)
                }

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 144), spacing: 10)], alignment: .leading, spacing: 10) {
                    ForEach(NativeDictionaryModel.DeveloperScreenshotPreset.allCases) { preset in
                        Button {
                            model.applyDeveloperScreenshotPreset(preset)
                        } label: {
                            VStack(alignment: .leading, spacing: 6) {
                                Text(preset.label)
                                    .font(.system(size: 15, weight: .semibold, design: .rounded))

                                Text(preset.summary)
                                    .font(.system(size: 13, weight: .regular, design: .rounded))
                                    .foregroundStyle(NativePalette.mutedText)
                                    .multilineTextAlignment(.leading)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 12)
                            .background(
                                model.developerScreenshotPreset == preset ? NativePalette.accentMuted : NativePalette.panelStrong,
                                in: RoundedRectangle(cornerRadius: 18, style: .continuous)
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 18, style: .continuous)
                                    .stroke(
                                        model.developerScreenshotPreset == preset ? NativePalette.accent.opacity(0.28) : NativePalette.border,
                                        lineWidth: 1
                                    )
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }

                HStack {
                    Button("Clear preset") {
                        model.clearDeveloperScreenshotPreset()
                    }
                    .buttonStyle(NativeSecondaryButtonStyle())
                }

                NativeSettingsValueRow(
                    label: "Launch arguments",
                    value: "-developer-mode YES -developer-screenshot-preset search -site-theme book"
                )
            }

            NativeCard(emphasis: true) {
                NativeSectionLabel(text: "Internal testing")

                Text("Use this page to compare the on-device catalogue with production, force a sync when editorial publishes a new word, and exercise the same slug-routing path used by links and local notification taps.")
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
                NativeSectionLabel(text: "Notifications")

                NativeSettingsValueRow(label: "Permission", value: model.pushAuthorizationStatus)
                NativeSettingsValueRow(label: "Queued notices", value: model.pushScheduledNotificationCountLabel)
                NativeSettingsValueRow(label: "Next delivery", value: model.pushNextScheduledFireLabel)
                NativeSettingsValueRow(label: "Schedule timezone", value: model.pushScheduledTimeZone)
                NativeSettingsValueRow(label: "Scheduled catalogue", value: model.pushScheduledCatalogVersionLabel)

                Text(model.pushStatusMessage)
                    .font(.system(size: 15, weight: .regular, design: .rounded))

                Text(model.pushScheduleStatusMessage)
                    .font(.system(size: 14, weight: .regular, design: .rounded))
                    .foregroundStyle(NativePalette.mutedText)

                if model.shouldShowPushPrompt {
                    Button(model.pushPermissionButtonTitle) {
                        Task {
                            await model.handlePushPermissionAction()
                        }
                    }
                    .buttonStyle(NativeSecondaryButtonStyle())
                }
            }

            NativeCard {
                NativeSectionLabel(text: "Slug probe")

                Text("Exercise the slug-resolution path that refreshes once when production has a newer catalogue.")
                    .font(.system(size: 14, weight: .regular, design: .rounded))
                    .foregroundStyle(NativePalette.mutedText)

                NativeSettingsTextField(
                    title: "Testing slug",
                    placeholder: "new-word-slug",
                    text: $testingSlug
                )

                HStack {
                    Button("Use suggested slug") {
                        testingSlug = model.suggestedTestSlug ?? testingSlug
                    }
                    .buttonStyle(NativeSecondaryButtonStyle())

                    Button("Test deep link") {
                        model.simulateDeepLink(slug: testingSlug)
                    }
                    .buttonStyle(NativePrimaryButtonStyle())

                    Button("Simulate local notification tap") {
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
        }
        .navigationTitle("Settings")
        .nativeNavigationBarTitleDisplayMode(.large)
        .nativeOverflowToolbarIfNeeded(model: model, themeManager: .shared)
        .task {
            if testingSlug.isEmpty {
                testingSlug = model.suggestedTestSlug ?? ""
            }
            model.syncDeveloperScreenshotModeFromDefaults()
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

private struct NativeSettingsHourPicker: View {
    let title: String
    let selectionLabel: String
    let selection: Int
    let enabled: Bool
    let onSelected: (Int) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                .textCase(.uppercase)
                .foregroundStyle(NativePalette.mutedText)

            Menu {
                Picker(title, selection: Binding(
                    get: { selection },
                    set: { onSelected($0) }
                )) {
                    ForEach(0..<24, id: \.self) { hour in
                        Text(String(format: "%02d:00", hour)).tag(hour)
                    }
                }
            } label: {
                HStack {
                    Text(selectionLabel)
                        .font(.system(size: 15, weight: .regular, design: .rounded))
                    Spacer()
                    Image(systemName: "chevron.up.chevron.down")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(NativePalette.mutedText)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .background(NativePalette.panelStrong, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(NativePalette.border, lineWidth: 1)
                )
                .opacity(enabled ? 1 : 0.55)
            }
            .disabled(!enabled)
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
                .nativeTextEntryBehavior()
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
                Button("Clear filters") {
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
    var showsCloseButton = true

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

                Button("Search entries") {
                    if showsCloseButton {
                        dismiss()
                    }
                    model.showSection(.search)
                }
                .buttonStyle(NativeSecondaryButtonStyle())
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
        .nativeNavigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                if showsCloseButton {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

private struct NativeGuideView: View {
    @Environment(\.dismiss) private var dismiss
    var showsCloseButton = true

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
        .nativeNavigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                if showsCloseButton {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

private struct NativeAboutView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var model: NativeDictionaryModel
    var showsCloseButton = true

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
        .nativeNavigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                if showsCloseButton {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

private struct NativeMissingEntryView: View {
    @Environment(\.dismiss) private var dismiss
    var showsCloseButton = true

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
                if showsCloseButton {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

private struct NativeCategoryDetailView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var model: NativeDictionaryModel
    let category: CategoryStat

    private var categoryEntries: [Entry] {
        model.entries(forCategory: category.slug)
    }

    var body: some View {
        NativeScreen { _ in
            NativeCard(emphasis: true) {
                NativeSectionLabel(text: "Category")

                Text(category.title)
                    .font(.system(size: 32, weight: .bold, design: .serif))

                Text(category.description)
                    .font(.system(size: 17, weight: .medium, design: .rounded))
                    .foregroundStyle(NativePalette.mutedText)

                Text("\(categoryEntries.count) of \(category.count) terms")
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(NativePalette.accent)
            }

            if categoryEntries.isEmpty {
                NativeCard {
                    Text("No entries published in this category yet.")
                        .font(.system(size: 17, weight: .medium, design: .rounded))
                        .foregroundStyle(NativePalette.mutedText)
                }
            } else {
                ForEach(categoryEntries, id: \.slug) { entry in
                    NativeEntryCard(entry: entry, compact: true) {
                        model.presentEntry(entry)
                    }
                }
            }
        }
        .navigationTitle(category.title)
        .nativeNavigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Done") {
                    dismiss()
                }
            }
        }
    }
}

private struct NativeRelatedTermsView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var model: NativeDictionaryModel
    let entry: Entry

    private var related: [Entry] {
        model.relatedEntries(for: entry)
    }

    var body: some View {
        NativeScreen { _ in
            NativeCard(emphasis: true) {
                NativeSectionLabel(text: "Related terms")
                Text(entry.title)
                    .font(.system(size: 32, weight: .bold, design: .serif))
                Text("Entries that share a category or see-also with this term.")
                    .font(.system(size: 15, weight: .regular, design: .rounded))
                    .foregroundStyle(NativePalette.mutedText)
            }

            if related.isEmpty {
                NativeCard {
                    Text("No related terms on record yet.")
                        .font(.system(size: 17, weight: .medium, design: .rounded))
                        .foregroundStyle(NativePalette.mutedText)
                }
            } else {
                ForEach(related, id: \.slug) { other in
                    NativeEntryCard(entry: other, compact: true) {
                        model.presentEntry(other)
                    }
                }
            }
        }
        .navigationTitle("Related terms")
        .nativeNavigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Done") { dismiss() }
            }
        }
    }
}

private struct NativeSavedToast: View {
    @ObservedObject var model: NativeDictionaryModel

    var body: some View {
        if let message = model.savedToast {
            HStack(spacing: 12) {
                Image(systemName: "bookmark.fill")
                    .foregroundStyle(NativePalette.accent)
                Text(message)
                    .font(.system(size: 15, weight: .medium, design: .rounded))
                    .foregroundStyle(.primary)
                Spacer(minLength: 0)
                Button("Open") {
                    model.dismissSavedToast()
                    model.showSection(.saved)
                }
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .foregroundStyle(NativePalette.accent)
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 12)
            .background(NativePalette.panelStrong, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(NativePalette.border, lineWidth: 1)
            )
            .shadow(color: .black.opacity(0.12), radius: 16, y: 6)
            .padding(.horizontal, 18)
            .padding(.bottom, 80)
            .transition(.move(edge: .bottom).combined(with: .opacity))
            .animation(.easeOut(duration: 0.2), value: model.savedToast)
            .onTapGesture {
                model.dismissSavedToast()
            }
        }
    }
}

struct NativeOverflowToolbar: ToolbarContent {
    @ObservedObject var model: NativeDictionaryModel
    @ObservedObject var themeManager: ThemeManager

    var body: some ToolbarContent {
        #if os(macOS)
        ToolbarItemGroup(placement: .automatic) {
            EmptyView()
        }
        #else
        ToolbarItem(placement: .nativeNavigationTrailing) {
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
            } label: {
                Image(systemName: "ellipsis.circle")
                    .foregroundStyle(NativePalette.accent)
            }
        }
        #endif
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

private struct NativeActiveFilterChips: View {
    @ObservedObject var model: NativeDictionaryModel

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                if let slug = model.searchCategorySlug,
                   let category = model.categoryStats.first(where: { $0.slug == slug }) {
                    chip(label: category.title) {
                        model.searchCategorySlug = nil
                    }
                }

                if let difficulty = model.searchDifficulty {
                    chip(label: nativeDifficultyLabel(difficulty)) {
                        model.searchDifficulty = nil
                    }
                }

                if let depth = model.searchTechnicalDepth {
                    chip(label: nativeTechnicalDepthLabel(depth)) {
                        model.searchTechnicalDepth = nil
                    }
                }

                if let letter = model.searchLetter {
                    chip(label: "Letter \(letter)") {
                        model.searchLetter = nil
                    }
                }

                if model.searchVendorFilter != .all {
                    chip(label: model.searchVendorFilter == .vendorOnly ? "Vendor only" : "No vendor terms") {
                        model.searchVendorFilter = .all
                    }
                }
            }
        }
    }

    private func chip(label: String, onClear: @escaping () -> Void) -> some View {
        Button {
            onClear()
        } label: {
            HStack(spacing: 6) {
                Text(label)
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 12, weight: .semibold))
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(NativePalette.accentMuted, in: Capsule())
            .overlay(
                Capsule().stroke(NativePalette.accent.opacity(0.28), lineWidth: 1)
            )
            .foregroundStyle(NativePalette.accent)
        }
        .buttonStyle(.plain)
    }
}
