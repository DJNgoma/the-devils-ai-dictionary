import Foundation
import SwiftUI
import UIKit

#if canImport(DevilsAIDictionaryCore)
import DevilsAIDictionaryCore
#endif

@MainActor
final class NativeDictionaryModel: ObservableObject {
    enum AppTab: Hashable {
        case home
        case browse
        case search
        case saved
    }

    enum ActiveSheet: Identifiable, Equatable {
        case about
        case book
        case guide
        case entry(String)

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
            }
        }
    }

    struct EntrySection: Identifiable {
        let title: String
        let entries: [Entry]

        var id: String {
            title
        }
    }

    @Published var selectedTab: AppTab = .home
    @Published var activeSheet: ActiveSheet?
    @Published var browseLetter: String?
    @Published var browseCategorySlug: String?
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

    var categoryStats: [CategoryStat] {
        catalogSnapshot?.catalog.categoryStats ?? []
    }

    var letterOptions: [String] {
        (catalogSnapshot?.catalog.letterStats ?? [])
            .map(\.letter)
            .sorted()
    }

    var browseSections: [EntrySection] {
        let filter = EntryFilter(categorySlug: browseCategorySlug, letter: browseLetter)
        let filtered = catalogSnapshot?.catalog.entries(matching: filter) ?? []
        let grouped = Dictionary(grouping: filtered, by: \.letter)

        return grouped.keys.sorted().map { letter in
            EntrySection(
                title: letter,
                entries: grouped[letter, default: []]
                    .sorted { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
            )
        }
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

        guard !trimmedQuery.isEmpty else {
            return filtered.sorted { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
        }

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

        return scoredResults.map(\.entry)
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
        pushAuthorizationStatus != "authorized"
    }

    var pushPermissionButtonTitle: String {
        pushAuthorizationStatus == "denied" ? "Open Settings" : "Enable notifications"
    }

    var pushStatusMessage: String {
        switch pushAuthorizationStatus {
        case "authorized":
            return "Notifications are enabled for this device."
        case "denied":
            return "Notifications are currently denied in iOS settings."
        case "provisional":
            return "Notifications are being delivered quietly."
        case "notDetermined":
            return "Enable notifications to let this app deliver the next good word."
        default:
            return "Native push is wired, but iOS has not confirmed the final permission state yet."
        }
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

    func presentEntry(slug: String) {
        guard entry(slug: slug) != nil else {
            return
        }

        activeSheet = .entry(slug)
    }

    func presentEntry(_ entry: Entry) {
        presentEntry(slug: entry.slug)
    }

    func presentBook() {
        activeSheet = .book
    }

    func presentGuide() {
        activeSheet = .guide
    }

    func presentAbout() {
        activeSheet = .about
    }

    func dismissSheet() {
        activeSheet = nil
    }

    func showBrowse(letter: String?) {
        browseLetter = letter
        selectedTab = .browse
    }

    func showBrowse(categorySlug: String?) {
        browseCategorySlug = categorySlug
        selectedTab = .browse
    }

    func showCategoryInSearch(_ slug: String?) {
        searchCategorySlug = slug
        selectedTab = .search
    }

    func resetSearchFilters() {
        searchCategorySlug = nil
        searchDifficulty = nil
        searchTechnicalDepth = nil
        searchVendorFilter = .all
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
            selectedTab = .browse
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
                selectedTab = .browse
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
    }

    private func observeNativeState() {
        let center = NotificationCenter.default

        for name in [
            Notification.Name.currentWordDidChange,
            Notification.Name.currentWordPendingNavigationDidChange,
            Notification.Name.currentWordPushStateDidChange,
            Notification.Name.catalogSnapshotDidChange,
            UIApplication.didBecomeActiveNotification,
        ] {
            let token = center.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                Task { @MainActor in
                    if name == UIApplication.didBecomeActiveNotification {
                        self?.objectWillChange.send()
                    } else {
                        self?.refreshFromManager()
                    }
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

        if let path = state["pendingNavigationPath"] as? String {
            consumePendingNavigation(path: path)
        }
    }

    private func consumePendingNavigation(path: String) {
        guard let slug = Self.slug(fromDictionaryPath: path) else {
            manager.consumePendingNavigationPath(path)
            return
        }

        selectedTab = .browse
        activeSheet = .entry(slug)
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
        let searchText = entry.searchText.lowercased()

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
        guard let url = URL(string: UIApplication.openSettingsURLString) else {
            return
        }

        UIApplication.shared.open(url)
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
}
