import Foundation
import SwiftUI

#if os(iOS)
import UIKit
#endif

#if canImport(DevilsAIDictionaryCore)
import DevilsAIDictionaryCore
#endif

@MainActor
final class NativeDictionaryModel: ObservableObject {
    enum AppTab: String, CaseIterable, Hashable, Identifiable {
        case home
        case search
        case categories
        case saved
        case settings

        var id: String {
            rawValue
        }

        var label: String {
            switch self {
            case .home:
                return "Home"
            case .search:
                return "Search"
            case .categories:
                return "Categories"
            case .saved:
                return "Saved"
            case .settings:
                return "Settings"
            }
        }

        var systemImage: String {
            switch self {
            case .home:
                return "house"
            case .search:
                return "magnifyingglass"
            case .categories:
                return "square.grid.2x2"
            case .saved:
                return "bookmark"
            case .settings:
                return "slider.horizontal.3"
            }
        }
    }

    enum ActiveSheet: Identifiable, Equatable {
        case about
        case book
        case guide
        case entry(String)
        case category(String)
        case related(String)

        var id: String {
            switch self {
            case .about:
                return "about"
            case .book:
                return "book"
            case .guide:
                return "guide"
            case .entry(let slug):
                return "entry-\(slug)"
            case .category(let slug):
                return "category-\(slug)"
            case .related(let slug):
                return "related-\(slug)"
            }
        }
    }

    enum MacDetailRoute: Equatable {
        case section(AppTab)
        case entry(String)
        case book
        case guide
        case about
    }

    struct EntrySection: Identifiable {
        let title: String
        let entries: [Entry]

        var id: String {
            title
        }
    }

    @Published var selectedTab: AppTab = .home
    @Published var macSidebarSelection: AppTab = .home
    @Published var macDetailRoute: MacDetailRoute = .section(.home)
    @Published var activeSheet: ActiveSheet?
    @Published var searchLetter: String?
    @Published var searchQuery = ""
    @Published var searchCategorySlug: String?
    @Published var searchDifficulty: Difficulty?
    @Published var searchTechnicalDepth: TechnicalDepth?
    @Published var searchVendorFilter: VendorFilter = .all
    @Published private(set) var catalogSnapshot: DictionaryCatalogSnapshot?
    @Published private(set) var currentWord: CurrentWordRecord?
    @Published private(set) var pushAuthorizationStatus = "unknown"
    @Published private(set) var pushTokenAvailable = false
    @Published private(set) var catalogVersion: String?
    @Published private(set) var savedPlace: BookmarkRecord?
    @Published private(set) var loadError: String?
    @Published private(set) var actionError: String?
    @Published private(set) var isCheckingLiveCatalog = false
    @Published private(set) var isRefreshingCatalog = false
    @Published private(set) var lastCatalogCheckAt: Date?
    @Published private(set) var liveCatalogManifest: CatalogManifest?
    @Published private(set) var liveCatalogCheckedAt: Date?
    @Published private(set) var liveCatalogError: String?
    @Published private(set) var savedToast: String?

    private var savedToastTask: Task<Void, Never>?

    private let manager: PhoneCurrentWordManager
    private let savedPlaceStore = NativeSavedPlaceStore()
    private var notificationTokens: [NSObjectProtocol] = []

    init(manager: PhoneCurrentWordManager) {
        self.manager = manager

        savedPlace = savedPlaceStore.load()
        refreshFromManager()
        observeNativeState()
    }

    deinit {
        notificationTokens.forEach(NotificationCenter.default.removeObserver)
    }

    var entries: [Entry] {
        catalogSnapshot?.catalog.entries ?? []
    }

    var featuredEntry: Entry? {
        catalogSnapshot?.catalog.featuredEntry()
    }

    var todayWord: Entry? {
        catalogSnapshot?.catalog.dailyWord()
    }

    var recentEntries: [Entry] {
        catalogSnapshot?.catalog.recentEntries(limit: 4) ?? []
    }

    var latestPublishedAt: String? {
        catalogSnapshot?.catalog.latestPublishedAt
    }

    var misunderstoodEntries: [Entry] {
        catalogSnapshot?.catalog.misunderstoodEntries(limit: 4) ?? []
    }

    func entries(forCategory slug: String) -> [Entry] {
        let filter = EntryFilter(categorySlug: slug)
        return (catalogSnapshot?.catalog.entries(matching: filter) ?? [])
            .sorted { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
    }

    var categoryStats: [CategoryStat] {
        catalogSnapshot?.catalog.categoryStats ?? []
    }

    static let glossaryCategorySlugs: Set<String> = ["cultural-terms", "product-and-vendor-terms"]

    var glossaryCategoryStats: [CategoryStat] {
        categoryStats.filter { Self.glossaryCategorySlugs.contains($0.slug) }
    }

    var nonGlossaryCategoryStats: [CategoryStat] {
        categoryStats.filter { !Self.glossaryCategorySlugs.contains($0.slug) }
    }

    var letterOptions: [String] {
        (catalogSnapshot?.catalog.letterStats ?? [])
            .map(\.letter)
            .sorted()
    }

    var hasSearchFilters: Bool {
        searchCategorySlug != nil ||
            searchDifficulty != nil ||
            searchTechnicalDepth != nil ||
            searchVendorFilter != .all
    }

    var searchResults: [Entry] {
        let filter = EntryFilter(
            categorySlug: searchCategorySlug,
            difficulty: searchDifficulty,
            technicalDepth: searchTechnicalDepth,
            vendorFilter: searchVendorFilter
        )
        let filtered = catalogSnapshot?.catalog.entries(matching: filter) ?? []
        let trimmedQuery = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines)

        let base: [Entry]
        if trimmedQuery.isEmpty {
            base = filtered.sorted { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
        } else {
            let normalizedTokens = trimmedQuery
                .lowercased()
                .split(whereSeparator: \.isWhitespace)
                .map(String.init)

            let scoredResults: [(entry: Entry, score: Int)] = filtered
                .compactMap { entry in
                    let score = Self.searchScore(for: entry, tokens: normalizedTokens)
                    guard score > 0 else {
                        return nil
                    }

                    return (entry: entry, score: score)
                }
                .sorted { lhs, rhs in
                    if lhs.1 == rhs.1 {
                        return lhs.0.title.localizedCaseInsensitiveCompare(rhs.0.title) == .orderedAscending
                    }

                    return lhs.1 > rhs.1
                }

            base = scoredResults.map(\.entry)
        }

        if let searchLetter {
            return base.filter { $0.letter == searchLetter }
        }

        return base
    }

    var savedEntry: Entry? {
        guard let slug = savedPlaceSlug else {
            return nil
        }

        return entry(slug: slug)
    }

    var savedPlaceSlug: String? {
        guard let href = savedPlace?.href else {
            return nil
        }

        return Self.slug(fromDictionaryPath: href)
    }

    var shouldShowPushPrompt: Bool {
        !["authorized", "unsupported"].contains(pushAuthorizationStatus)
    }

    var pushPermissionButtonTitle: String {
        pushAuthorizationStatus == "denied" ? "Open Settings" : "Enable notifications"
    }

    var pushStatusMessage: String {
        switch pushAuthorizationStatus {
        case "authorized":
            return "Notifications are enabled for this device."
        case "denied":
            return "Notifications are currently denied in system settings."
        case "provisional":
            return "Notifications are being delivered quietly."
        case "unsupported":
            return "Push notifications are not wired for this Apple platform yet."
        case "notDetermined":
            return "Enable notifications to let this app deliver the next good word."
        default:
            return "Native push is wired, but iOS has not confirmed the final permission state yet."
        }
    }

    var appVersionLabel: String {
        let marketingVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        let buildNumber = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
        return "\(marketingVersion) (\(buildNumber))"
    }

    var siteBaseURLString: String {
        mobileBaseURL()?.absoluteString ?? "https://thedevilsaidictionary.com"
    }

    var macShowsInlineDetail: Bool {
        guard case .section(let section) = macDetailRoute else {
            return true
        }

        return section != macSidebarSelection
    }

    var macReturnButtonTitle: String {
        "Back to \(macSidebarSelection.label)"
    }

    var catalogManifestURLString: String {
        mobileBaseURL()?
            .appendingPathComponent("mobile-catalog", isDirectory: true)
            .appendingPathComponent("manifest.json")
            .absoluteString ?? "https://thedevilsaidictionary.com/mobile-catalog/manifest.json"
    }

    var deviceEntryCount: Int {
        catalogSnapshot?.catalog.entries.count ?? 0
    }

    var bundledCatalogVersion: String? {
        PhoneCatalogManager.shared.bundledCatalogVersion
    }

    var suggestedTestSlug: String? {
        recentEntries.first?.slug ?? currentWord?.slug
    }

    var liveCatalogMatchesDevice: Bool? {
        guard let liveCatalogVersion = liveCatalogManifest?.catalogVersion,
              let catalogVersion else {
            return nil
        }

        return liveCatalogVersion == catalogVersion
    }

    var liveCatalogStatusMessage: String {
        if let liveCatalogError {
            return liveCatalogError
        }

        guard let liveCatalogManifest else {
            return "Check the live site to compare this build against production."
        }

        guard let catalogVersion else {
            return "The live site is reachable, but this build has not loaded a local catalogue yet."
        }

        if liveCatalogManifest.catalogVersion == catalogVersion {
            return "This device matches the live catalogue."
        }

        return "The live site has a different catalogue version. Sync now to test the OTA refresh path."
    }

    var pushTokenStatusMessage: String {
        if pushAuthorizationStatus == "unsupported" {
            return "Push token delivery is not enabled for this Apple platform."
        }

        return pushTokenAvailable ? "APNs token is present for this device." : "APNs token is not available yet."
    }

    func entry(slug: String) -> Entry? {
        catalogSnapshot?.catalog.entry(slug: slug)
    }

    func entry(forSeeAlsoLabel label: String) -> Entry? {
        let trimmed = label.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            return nil
        }

        if let direct = entry(slug: trimmed) {
            return direct
        }

        let slug = Self.slugify(trimmed)
        guard !slug.isEmpty else {
            return nil
        }

        return entry(slug: slug)
    }

    func relatedEntries(for entry: Entry) -> [Entry] {
        guard let catalogSnapshot else {
            return []
        }

        let explicit = catalogSnapshot.catalog.entries(for: entry.relatedSlugs)
        guard !explicit.isEmpty else {
            return catalogSnapshot.catalog
                .entries(matching: EntryFilter(categorySlug: entry.categorySlugs.first))
                .filter { $0.slug != entry.slug }
                .prefix(3)
                .map { $0 }
        }

        return explicit
    }

    func showSection(_ section: AppTab) {
        selectedTab = section
        macSidebarSelection = section
        macDetailRoute = .section(section)
    }

    func returnToMacSection() {
        macDetailRoute = .section(macSidebarSelection)
    }

    func presentEntry(slug: String) {
        guard entry(slug: slug) != nil else {
            return
        }

        macDetailRoute = .entry(slug)
        activeSheet = .entry(slug)
    }

    func presentEntry(_ entry: Entry) {
        presentEntry(slug: entry.slug)
    }

    func presentBook() {
        macDetailRoute = .book
        activeSheet = .book
    }

    func presentGuide() {
        macDetailRoute = .guide
        activeSheet = .guide
    }

    func presentAbout() {
        macDetailRoute = .about
        activeSheet = .about
    }

    func presentCategory(_ slug: String) {
        guard categoryStats.contains(where: { $0.slug == slug }) else {
            return
        }

        activeSheet = .category(slug)
    }

    func presentRelatedTerms(for entry: Entry) {
        activeSheet = .related(entry.slug)
    }

    func dismissSheet() {
        activeSheet = nil
        macDetailRoute = .section(macSidebarSelection)
    }

    func showSearch(letter: String?) {
        searchLetter = letter
        showSection(.search)
    }

    func showCategoryInSearch(_ slug: String?) {
        searchCategorySlug = slug
        showSection(.search)
    }

    func resetSearchFilters() {
        searchCategorySlug = nil
        searchDifficulty = nil
        searchTechnicalDepth = nil
        searchVendorFilter = .all
        searchLetter = nil
    }

    func save(entry: Entry) {
        let record = BookmarkRecord(
            href: "/dictionary/\(entry.slug)",
            title: entry.title,
            label: "Dictionary entry",
            description: entry.devilDefinition.trimmingCharacters(in: .whitespacesAndNewlines),
            savedAt: Self.timestamp()
        )
        persistSavedPlace(record)
    }

    func saveBook() {
        let record = BookmarkRecord(
            href: "/book",
            title: "The Devil's AI Dictionary",
            label: "Book landing page",
            description: "A field guide for people already in the room.",
            savedAt: Self.timestamp()
        )
        persistSavedPlace(record)
    }

    func clearSavedPlace() {
        savedPlaceStore.clear()
        savedPlace = nil
    }

    func openSavedPlace() {
        guard let savedPlace else {
            showSection(.search)
            return
        }

        switch savedPlace.href {
        case "/book":
            presentBook()
        case "/about":
            presentAbout()
        case "/how-to-read":
            presentGuide()
        default:
            if let slug = Self.slug(fromDictionaryPath: savedPlace.href) {
                presentEntry(slug: slug)
            } else {
                showSection(.search)
            }
        }
    }

    func openCurrentWord() {
        if let slug = currentWord?.slug {
            presentEntry(slug: slug)
        }
    }

    func openTodayWord() {
        guard let todayWord else {
            return
        }

        presentEntry(todayWord)
    }

    func openRandomEntry() {
        guard let randomEntry = catalogSnapshot?.catalog.randomEntry(excluding: todayWord?.slug) else {
            return
        }

        presentEntry(randomEntry)
    }

    func shareURL(for entry: Entry) -> URL? {
        URL(string: "https://thedevilsaidictionary.com\(entry.url)")
    }

    func refreshCurrentWord() {
        _ = manager.refreshCurrentWord()
        refreshFromManager()
    }

    func checkLiveCatalogIfNeeded() async {
        guard liveCatalogManifest == nil, liveCatalogCheckedAt == nil, liveCatalogError == nil else {
            return
        }

        await checkLiveCatalog()
    }

    func checkLiveCatalog() async {
        guard !isCheckingLiveCatalog else {
            return
        }

        guard let baseURL = mobileBaseURL() else {
            liveCatalogError = "The app does not have a valid mobile API base URL."
            liveCatalogCheckedAt = Date()
            return
        }

        isCheckingLiveCatalog = true
        liveCatalogError = nil
        defer { isCheckingLiveCatalog = false }

        do {
            liveCatalogManifest = try await CatalogUpdateClient().fetchManifest(baseURL: baseURL)
            liveCatalogCheckedAt = Date()
        } catch {
            liveCatalogManifest = nil
            liveCatalogCheckedAt = Date()
            liveCatalogError = error.localizedDescription
        }
    }

    func syncCatalogNow() async {
        isRefreshingCatalog = true
        await PhoneCatalogManager.shared.refreshIfNeeded(force: true)
        refreshFromManager()
        isRefreshingCatalog = false
        await checkLiveCatalog()
    }

    func simulateNotification(slug: String) async {
        let trimmedSlug = slug.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedSlug.isEmpty else {
            actionError = "Enter a slug before simulating a notification."
            return
        }

        actionError = nil
        await manager.handleRemoteNotificationResponse(userInfo: ["slug": trimmedSlug])
        refreshFromManager()
    }

    func simulateDeepLink(slug: String) {
        let trimmedSlug = slug.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedSlug.isEmpty else {
            actionError = "Enter a slug before testing a deep link."
            return
        }

        guard
            let encodedSlug = trimmedSlug.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed),
            let url = URL(string: "devilsaidictionary://dictionary/\(encodedSlug)")
        else {
            actionError = "That slug could not be turned into a test link."
            return
        }

        actionError = nil

        if !manager.handleIncomingURL(url) {
            actionError = "The test deep link did not resolve."
        }
    }

    func requestPushPermission() async {
        do {
            _ = try await manager.requestPushAuthorization()
            actionError = nil
            refreshFromManager()
        } catch {
            actionError = error.localizedDescription
        }
    }

    func handlePushPermissionAction() async {
        guard pushAuthorizationStatus == "denied" else {
            await requestPushPermission()
            return
        }

        actionError = nil
        openSystemSettings()
    }

    private func persistSavedPlace(_ record: BookmarkRecord) {
        savedPlaceStore.save(record)
        savedPlace = record
        showSavedToast("Saved to your reading place.")
    }

    private func showSavedToast(_ message: String) {
        savedToastTask?.cancel()
        savedToast = message
        savedToastTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 2_500_000_000)
            guard !Task.isCancelled else { return }
            await MainActor.run { self?.savedToast = nil }
        }
    }

    func dismissSavedToast() {
        savedToastTask?.cancel()
        savedToast = nil
    }

    func handleSceneActivation() async {
        await PhoneCatalogManager.shared.refreshIfNeeded()
        await manager.refreshDiagnosticsState()
        refreshFromManager()
    }

    private func observeNativeState() {
        let center = NotificationCenter.default

        for name in [
            Notification.Name.currentWordDidChange,
            Notification.Name.currentWordPendingNavigationDidChange,
            Notification.Name.currentWordPushStateDidChange,
            Notification.Name.catalogSnapshotDidChange,
        ] {
            let token = center.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                Task { @MainActor [weak self] in
                    self?.refreshFromManager()
                }
            }
            notificationTokens.append(token)
        }
    }

    private func refreshFromManager() {
        catalogSnapshot = PhoneCatalogManager.shared.snapshot
        loadError = PhoneCatalogManager.shared.refreshError
        let state = manager.getState()
        currentWord = Self.decodeCurrentWord(from: state["currentWord"])
        pushAuthorizationStatus = state["pushAuthorizationStatus"] as? String ?? "unknown"
        pushTokenAvailable = state["pushTokenAvailable"] as? Bool ?? false
        catalogVersion = state["catalogVersion"] as? String ?? catalogSnapshot?.version
        lastCatalogCheckAt = CatalogDiskStore().loadLastCheckAt()
        isRefreshingCatalog = PhoneCatalogManager.shared.isRefreshing

        if let path = state["pendingNavigationPath"] as? String {
            consumePendingNavigation(path: path)
        }
    }

    private func consumePendingNavigation(path: String) {
        guard let slug = Self.slug(fromDictionaryPath: path) else {
            manager.consumePendingNavigationPath(path)
            return
        }

        showSection(.search)
        presentEntry(slug: slug)
        manager.consumePendingNavigationPath(path)
    }

    private static func decodeCurrentWord(from value: Any?) -> CurrentWordRecord? {
        guard let dictionary = value as? [String: Any],
              JSONSerialization.isValidJSONObject(dictionary),
              let data = try? JSONSerialization.data(withJSONObject: dictionary),
              let record = try? JSONDecoder().decode(CurrentWordRecord.self, from: data)
        else {
            return nil
        }

        return record
    }

    private static func searchScore(for entry: Entry, tokens: [String]) -> Int {
        let title = entry.title.lowercased()
        let slug = entry.slug.lowercased()
        let aliases = entry.aliases.map { $0.lowercased() }
        let categories = entry.categories.map { $0.lowercased() }
        let searchText = (entry.searchText ?? "").lowercased()

        guard tokens.allSatisfy({ token in
            title.contains(token) ||
                slug.contains(token) ||
                aliases.contains(where: { $0.contains(token) }) ||
                categories.contains(where: { $0.contains(token) }) ||
                searchText.contains(token)
        }) else {
            return 0
        }

        return tokens.reduce(into: 0) { score, token in
            if title == token || slug == token {
                score += 140
            } else if title.hasPrefix(token) || slug.hasPrefix(token) {
                score += 90
            } else if aliases.contains(where: { $0 == token }) {
                score += 75
            } else if aliases.contains(where: { $0.hasPrefix(token) }) {
                score += 55
            } else if categories.contains(where: { $0.contains(token) }) {
                score += 35
            } else if searchText.contains(token) {
                score += 18
            }
        }
    }

    private static func slug(fromDictionaryPath path: String) -> String? {
        let trimmed = path.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.hasPrefix("/dictionary/") else {
            return nil
        }

        let slug = trimmed.replacingOccurrences(of: "/dictionary/", with: "")
        return slug.isEmpty ? nil : slug
    }

    private static func timestamp() -> String {
        SharedDateFormatter.iso8601.string(from: Date())
    }

    private func openSystemSettings() {
        #if os(iOS)
        guard let url = URL(string: UIApplication.openSettingsURLString) else {
            return
        }

        UIApplication.shared.open(url)
        #else
        actionError = "Open the system settings for this app to adjust notification permissions."
        #endif
    }

    private func mobileBaseURL() -> URL? {
        guard let baseURLString = Bundle.main.object(forInfoDictionaryKey: "MobileAPIBaseURL") as? String else {
            return nil
        }

        return URL(string: baseURLString)
    }

    private static func slugify(_ value: String) -> String {
        let sanitized = value
            .lowercased()
            .replacingOccurrences(of: "&", with: " and ")
            .map { character -> Character in
                character.isLetter || character.isNumber ? character : "-"
            }

        return String(sanitized)
            .replacingOccurrences(of: "-+", with: "-", options: .regularExpression)
            .trimmingCharacters(in: CharacterSet(charactersIn: "-"))
    }
}

private struct NativeSavedPlaceStore {
    private let key = "saved-reading-place"
    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    func load() -> BookmarkRecord? {
        guard let json = defaults.string(forKey: key),
              let data = json.data(using: .utf8),
              let record = try? JSONDecoder().decode(BookmarkRecord.self, from: data)
        else {
            return nil
        }

        return record
    }

    func save(_ record: BookmarkRecord) {
        guard let data = try? JSONEncoder().encode(record),
              let json = String(data: data, encoding: .utf8)
        else {
            return
        }

        defaults.set(json, forKey: key)
    }

    func clear() {
        defaults.removeObject(forKey: key)
    }
}

func nativeDifficultyLabel(_ difficulty: Difficulty) -> String {
    switch difficulty {
    case .beginner:
        return "Beginner"
    case .intermediate:
        return "Intermediate"
    case .advanced:
        return "Advanced"
    }
}

func nativeTechnicalDepthLabel(_ technicalDepth: TechnicalDepth) -> String {
    switch technicalDepth {
    case .low:
        return "Light"
    case .medium:
        return "Practical"
    case .high:
        return "Deep"
    }
}

func nativeFormattedDate(_ value: String) -> String {
    if let date = SharedDateParser.iso8601.date(from: value) {
        return SharedDateParser.display.string(from: date)
    }

    if let date = SharedDateParser.calendar.date(from: value) {
        return SharedDateParser.display.string(from: date)
    }

    return value
}

func nativeFormattedDate(_ value: Date) -> String {
    SharedDateParser.dateTime.string(from: value)
}

private enum SharedDateParser {
    static let iso8601: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
    static let calendar: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter
    }()
    static let display: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter
    }()
    static let dateTime: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()
}
