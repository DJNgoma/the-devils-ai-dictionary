import Foundation
import SwiftUI

#if os(iOS)
import AuthenticationServices
import UIKit
#endif

#if os(iOS) || os(macOS) || os(visionOS)
import Security
import StoreKit
#endif

#if canImport(DevilsAIDictionaryCore)
import DevilsAIDictionaryCore
#endif

// MARK: - Apple account sync

#if os(iOS) || os(macOS) || os(visionOS)
private enum NativeAppleBackendError: LocalizedError {
    case missingBaseURL
    case invalidResponse
    case invalidStatus(Int, String?)

    var errorDescription: String? {
        switch self {
        case .missingBaseURL:
            return "The app does not have a valid API base URL."
        case .invalidResponse:
            return "The server returned an invalid response."
        case .invalidStatus(let status, let body):
            if let body, !body.isEmpty {
                return "Request failed with status \(status): \(body)"
            }
            return "Request failed with status \(status)."
        }
    }
}

struct NativeAppleSessionState: Codable, Equatable, Sendable {
    let isAuthenticated: Bool
    let displayName: String?
    let email: String?
    let lastSyncedAt: String?
    let savedWordCount: Int?

    init(
        isAuthenticated: Bool = true,
        displayName: String?,
        email: String?,
        lastSyncedAt: String?,
        savedWordCount: Int?
    ) {
        self.isAuthenticated = isAuthenticated
        self.displayName = displayName
        self.email = email
        self.lastSyncedAt = lastSyncedAt
        self.savedWordCount = savedWordCount
    }
}

private struct NativeAppleAuthRequest: Encodable {
    let authorizationCode: String
    let identityToken: String?
    let userIdentifier: String
    let name: String?
    let email: String?
}

private struct NativeAppleAuthResponse: Decodable {
    let sessionToken: String
}

private struct NativeSavedWordsBatchRequest: Encodable {
    let replace: Bool?
    let words: [SavedWordRecord]
}

struct NativeSavedWordsSyncSnapshot: Sendable {
    let lastSyncedAt: String?
    let savedWordCount: Int?
    let savedWords: [SavedWordRecord]
}

private final class NativeAppleSessionTokenStore {
    private let account = "apple-session-token"
    private let service = "com.djngoma.devilsaidictionary"

    func load() -> String? {
        let query: [CFString: Any] = [
            kSecAttrAccount: account,
            kSecAttrService: service,
            kSecClass: kSecClassGenericPassword,
            kSecMatchLimit: kSecMatchLimitOne,
            kSecReturnData: true,
        ]
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let token = String(data: data, encoding: .utf8)
        else {
            return nil
        }

        return token
    }

    func save(_ token: String?) {
        clear()

        guard let token,
              let data = token.data(using: .utf8)
        else {
            return
        }

        let query: [CFString: Any] = [
            kSecAttrAccount: account,
            kSecAttrService: service,
            kSecClass: kSecClassGenericPassword,
            kSecValueData: data,
        ]

        SecItemAdd(query as CFDictionary, nil)
    }

    func clear() {
        let query: [CFString: Any] = [
            kSecAttrAccount: account,
            kSecAttrService: service,
            kSecClass: kSecClassGenericPassword,
        ]

        SecItemDelete(query as CFDictionary)
    }
}

final class NativeAppleBackendClient {
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()
    private let sessionTokenStore = NativeAppleSessionTokenStore()

    func exchangeAuthorizationCode(
        authorizationCode: String,
        identityToken: String?,
        userIdentifier: String,
        name: String?,
        email: String?
    ) async throws {
        let result = try await send(
            path: "/api/auth/apple/native",
            method: "POST",
            body: NativeAppleAuthRequest(
                authorizationCode: authorizationCode,
                identityToken: identityToken,
                userIdentifier: userIdentifier,
                name: name,
                email: email
            )
        )

        let payload = try decoder.decode(NativeAppleAuthResponse.self, from: result.data)
        sessionTokenStore.save(payload.sessionToken)
    }

    func fetchSession() async throws -> NativeAppleSessionState? {
        guard sessionTokenStore.load() != nil else {
            return nil
        }

        let result = try await send(path: "/api/auth/session", method: "GET", allowUnauthorized: true)

        return parseSession(from: result.data)
    }

    func signOut() async throws {
        defer { sessionTokenStore.clear() }
        _ = try await send(path: "/api/auth/logout", method: "POST", allowUnauthorized: true)
    }

    func clearSessionToken() {
        sessionTokenStore.clear()
    }

    func fetchSavedWords() async throws -> [SavedWordRecord] {
        guard sessionTokenStore.load() != nil else {
            return []
        }

        let result = try await send(path: "/api/me/saved-words", method: "GET", allowUnauthorized: true)
        guard result.http.statusCode != 401 else {
            return []
        }

        return parseSavedWords(from: result.data)
    }

    func upsertSavedWords(_ savedWords: [SavedWordRecord]) async throws -> NativeSavedWordsSyncSnapshot {
        guard !savedWords.isEmpty else {
            return NativeSavedWordsSyncSnapshot(lastSyncedAt: nil, savedWordCount: 0, savedWords: [])
        }

        let result = try await send(
            path: "/api/me/saved-words",
            method: "PUT",
            body: NativeSavedWordsBatchRequest(replace: nil, words: savedWords)
        )

        return parseSavedWordsSnapshot(from: result.data)
    }

    func replaceSavedWords(_ savedWords: [SavedWordRecord]) async throws -> NativeSavedWordsSyncSnapshot {
        let result = try await send(
            path: "/api/me/saved-words",
            method: "PUT",
            body: NativeSavedWordsBatchRequest(replace: true, words: savedWords)
        )

        return parseSavedWordsSnapshot(from: result.data)
    }

    private func send(
        path: String,
        method: String,
        queryItems: [URLQueryItem] = [],
        allowUnauthorized: Bool = false
    ) async throws -> (data: Data, http: HTTPURLResponse) {
        guard let baseURL = baseURL() else {
            throw NativeAppleBackendError.missingBaseURL
        }

        var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)
        components?.path = baseURL.path.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + path
        if !queryItems.isEmpty {
            components?.queryItems = queryItems
        }

        guard let url = components?.url else {
            throw NativeAppleBackendError.missingBaseURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = 15

        if let sessionToken = sessionTokenStore.load() {
            request.setValue("Bearer \(sessionToken)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let http = response as? HTTPURLResponse else {
            throw NativeAppleBackendError.invalidResponse
        }

        if allowUnauthorized && http.statusCode == 401 {
            sessionTokenStore.clear()
        }

        guard (200...299).contains(http.statusCode) || (allowUnauthorized && http.statusCode == 401) else {
            let body = String(data: data, encoding: .utf8)
            throw NativeAppleBackendError.invalidStatus(http.statusCode, body)
        }

        return (data: data, http: http)
    }

    private func send<Body: Encodable>(
        path: String,
        method: String,
        queryItems: [URLQueryItem] = [],
        body: Body,
        allowUnauthorized: Bool = false
    ) async throws -> (data: Data, http: HTTPURLResponse) {
        guard let baseURL = baseURL() else {
            throw NativeAppleBackendError.missingBaseURL
        }

        var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)
        components?.path = baseURL.path.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + path
        if !queryItems.isEmpty {
            components?.queryItems = queryItems
        }

        guard let url = components?.url else {
            throw NativeAppleBackendError.missingBaseURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = 15
        request.httpBody = try encoder.encode(body)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let sessionToken = sessionTokenStore.load() {
            request.setValue("Bearer \(sessionToken)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let http = response as? HTTPURLResponse else {
            throw NativeAppleBackendError.invalidResponse
        }

        if allowUnauthorized && http.statusCode == 401 {
            sessionTokenStore.clear()
        }

        guard (200...299).contains(http.statusCode) || (allowUnauthorized && http.statusCode == 401) else {
            let body = String(data: data, encoding: .utf8)
            throw NativeAppleBackendError.invalidStatus(http.statusCode, body)
        }

        return (data: data, http: http)
    }

    private func baseURL() -> URL? {
        guard
            let baseURLString = Bundle.main.object(forInfoDictionaryKey: "MobileAPIBaseURL") as? String,
            let url = URL(string: baseURLString)
        else {
            return nil
        }

        return url
    }

    private func parseSession(from data: Data) -> NativeAppleSessionState? {
        guard
            let json = try? JSONSerialization.jsonObject(with: data),
            let dictionary = json as? [String: Any]
        else {
            return nil
        }

        let userDictionary = Self.dictionary(from: dictionary["user"]) ?? dictionary
        let isAuthenticated = Self.bool(
            dictionary["authenticated"],
            dictionary["isAuthenticated"],
            dictionary["ok"]
        ) ?? true
        let displayName = Self.firstString(
            userDictionary["displayName"],
            userDictionary["name"],
            dictionary["displayName"],
            dictionary["name"]
        )
        let email = Self.firstString(userDictionary["email"], dictionary["email"])
        let savedWordCount = Self.int(
            dictionary["savedWordCount"],
            dictionary["savedWordsCount"],
            dictionary["count"]
        )
        let lastSyncedAt = Self.firstString(
            dictionary["lastSyncedAt"],
            dictionary["syncedAt"],
            dictionary["updatedAt"]
        )

        if !isAuthenticated {
            return nil
        }

        return NativeAppleSessionState(
            isAuthenticated: true,
            displayName: displayName,
            email: email,
            lastSyncedAt: lastSyncedAt,
            savedWordCount: savedWordCount
        )
    }

    private func parseSavedWords(from data: Data) -> [SavedWordRecord] {
        if let savedWords = try? decoder.decode([SavedWordRecord].self, from: data) {
            return savedWords.sorted(by: savedWordSort)
        }

        guard
            let json = try? JSONSerialization.jsonObject(with: data),
            let dictionary = json as? [String: Any]
        else {
            return []
        }

        for key in ["savedWords", "saved_words", "words", "items"] {
            if let array = dictionary[key] as? [[String: Any]] {
                return decodeSavedWordArray(array)
            }
        }

        return []
    }

    private func parseSavedWordsSnapshot(from data: Data) -> NativeSavedWordsSyncSnapshot {
        let savedWords = parseSavedWords(from: data)

        guard
            let json = try? JSONSerialization.jsonObject(with: data),
            let dictionary = json as? [String: Any]
        else {
            return NativeSavedWordsSyncSnapshot(
                lastSyncedAt: nil,
                savedWordCount: savedWords.count,
                savedWords: savedWords
            )
        }

        let lastSyncedAt = Self.firstString(
            dictionary["lastSyncedAt"],
            dictionary["syncedAt"],
            dictionary["updatedAt"]
        )
        let savedWordCount = Self.int(
            dictionary["savedWordCount"],
            dictionary["savedWordsCount"],
            dictionary["count"]
        ) ?? savedWords.count

        return NativeSavedWordsSyncSnapshot(
            lastSyncedAt: lastSyncedAt,
            savedWordCount: savedWordCount,
            savedWords: savedWords
        )
    }

    private func decodeSavedWordArray(_ array: [[String: Any]]) -> [SavedWordRecord] {
        array.compactMap { dictionary in
            guard
                JSONSerialization.isValidJSONObject(dictionary),
                let data = try? JSONSerialization.data(withJSONObject: dictionary),
                let record = try? decoder.decode(SavedWordRecord.self, from: data)
            else {
                return nil
            }

            return record
        }
        .sorted(by: savedWordSort)
    }

    private func savedWordSort(lhs: SavedWordRecord, rhs: SavedWordRecord) -> Bool {
        lhs.savedAt > rhs.savedAt
    }

    private static func dictionary(from value: Any?) -> [String: Any]? {
        value as? [String: Any]
    }

    private static func firstString(_ values: Any?...) -> String? {
        for value in values {
            if let string = value as? String, !string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return string
            }
        }

        return nil
    }

    private static func int(_ values: Any?...) -> Int? {
        for value in values {
            if let int = value as? Int {
                return int
            }

            if let number = value as? NSNumber {
                return number.intValue
            }

            if let string = value as? String, let int = Int(string) {
                return int
            }
        }

        return nil
    }

    private static func bool(_ values: Any?...) -> Bool? {
        for value in values {
            if let bool = value as? Bool {
                return bool
            }

            if let number = value as? NSNumber {
                return number.boolValue
            }

            if let string = value as? String {
                let lowercased = string.lowercased()
                if ["true", "yes", "1", "authenticated", "signedin"].contains(lowercased) {
                    return true
                }

                if ["false", "no", "0", "unauthenticated", "signedout"].contains(lowercased) {
                    return false
                }
            }
        }

        return nil
    }
}
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
        case onboarding
        case about
        case book
        case guide
        case entry(String)
        case category(String)
        case related(String)

        var id: String {
            switch self {
            case .onboarding:
                return "onboarding"
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

    enum DeveloperScreenshotPreset: String, CaseIterable, Identifiable {
        case home
        case search
        case categories
        case saved
        case entry

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
            case .entry:
                return "Entry"
            }
        }

        var summary: String {
            switch self {
            case .home:
                return "Front page with today's word and category shelves."
            case .search:
                return "Search tab with a live query and matching cards."
            case .categories:
                return "Editorial categories without extra chrome."
            case .saved:
                return "Saved words list seeded with a real entry."
            case .entry:
                return "Entry detail sheet for a reliable hero term."
            }
        }
    }

    @Published var selectedTab: AppTab = .home
    @Published var macSidebarSelection: AppTab = .home
    @Published var macDetailRoute: MacDetailRoute = .section(.home)
    @Published var activeSheet: ActiveSheet?
    @Published var searchLetter: String?
    @Published var searchQuery = "" {
        didSet {
            if !searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                searchLetter = nil
            }
        }
    }
    @Published var searchCategorySlug: String?
    @Published var searchDifficulty: Difficulty?
    @Published var searchTechnicalDepth: TechnicalDepth?
    @Published var searchVendorFilter: VendorFilter = .all
    @Published private(set) var catalogSnapshot: DictionaryCatalogSnapshot?
    @Published private(set) var currentWord: CurrentWordRecord?
    @Published private(set) var pushAuthorizationStatus = "unknown"
    @Published private(set) var pushNotificationsPreferenceEnabled = false
    @Published private(set) var pushNotificationsPreferenceConfigured = false
    @Published private(set) var pushPreferredDeliveryHour = CurrentWordStorage.defaultPushPreferredDeliveryHour
    @Published private(set) var pushScheduledNotificationCount = 0
    @Published private(set) var pushScheduledCatalogVersion: String?
    @Published private(set) var pushScheduledTimeZone = TimeZone.current.identifier
    @Published private(set) var pushNextScheduledFireAt: Date?
    @Published private(set) var catalogVersion: String?
    @Published private(set) var savedWords: [SavedWordRecord] = []
    @Published private(set) var appleSession: NativeAppleSessionState?
    @Published private(set) var appleAccountIdentity: AppleAccountIdentity?
    @Published private(set) var savedWordsSyncError: String?
    @Published private(set) var hasPendingSavedWordsSync = false
    @Published private(set) var isRefreshingSavedWordsSync = false
    @Published private(set) var lastSavedWordsSyncAt: Date?
    @Published private(set) var loadError: String?
    @Published private(set) var actionError: String?
    @Published private(set) var isCheckingLiveCatalog = false
    @Published private(set) var isRefreshingCatalog = false
    @Published private(set) var lastCatalogCheckAt: Date?
    @Published private(set) var liveCatalogManifest: CatalogManifest?
    @Published private(set) var liveCatalogCheckedAt: Date?
    @Published private(set) var liveCatalogError: String?
    @Published private(set) var savedToast: String?
    @Published private(set) var developerScreenshotPreset: DeveloperScreenshotPreset?

    private var savedToastTask: Task<Void, Never>?
    private var pendingSavedWordsSyncTask: Task<Void, Never>?
    private var pendingDeveloperScreenshotPreset: DeveloperScreenshotPreset?

    private let manager: PhoneCurrentWordManager
    private var savedWordsStorage = CurrentWordStorage()
    private let appleBackendClient = NativeAppleBackendClient()
    private let reviewManager = NativeAppReviewManager()
    private var notificationTokens: [NSObjectProtocol] = []

    init(manager: PhoneCurrentWordManager) {
        self.manager = manager

        if savedWordsStorage.markInstallationIfNeeded() {
            appleBackendClient.clearSessionToken()
        }

        savedWords = savedWordsStorage.loadSavedWords()
        appleAccountIdentity = savedWordsStorage.loadAppleAccountIdentity()
        refreshFromManager()
        syncDeveloperScreenshotModeFromDefaults()
        observeNativeState()

        #if os(iOS)
        if !savedWordsStorage.loadHasCompletedOnboarding() && !isDeveloperScreenshotMode {
            activeSheet = .onboarding
        }
        #endif
    }

    deinit {
        pendingSavedWordsSyncTask?.cancel()
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
        searchLetter != nil ||
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

    var savedPlace: BookmarkRecord? {
        savedWords.first?.bookmarkRecord
    }

    var savedEntry: Entry? {
        guard let slug = savedPlaceSlug else {
            return nil
        }

        return entry(slug: slug)
    }

    var savedPlaceSlug: String? {
        savedWords.first?.slug
    }

    var isAppleAccountSignedIn: Bool {
        appleSession != nil
    }

    var appleAccountStatusMessage: String {
        if appleSession != nil {
            return "Signed in with Apple."
        }

        return "Saved words stay on this device until you sign in with Apple."
    }

    var appleSyncStatusMessage: String {
        if isRefreshingSavedWordsSync {
            return "Syncing saved words now."
        }

        if hasPendingSavedWordsSync {
            return "Recent changes are queued. The clerk will send them shortly."
        }

        if let error = savedWordsSyncError {
            return error
        }

        if appleSession != nil {
            return "Saved words sync through your Apple account."
        }

        return "Sign in to sync saved words across installs."
    }

    var appleLastSyncedLabel: String? {
        if let lastSavedWordsSyncAt, appleSession != nil {
            return nativeFormattedDate(lastSavedWordsSyncAt)
        }

        if let lastSyncedAt = appleSession?.lastSyncedAt {
            return nativeFormattedDateTime(lastSyncedAt)
        }

        return nil
    }

    var appleSyncButtonTitle: String {
        if isRefreshingSavedWordsSync {
            return "Syncing…"
        }

        return isAppleAccountSignedIn ? "Sync now" : "Sign in with Apple"
    }

    var isDeveloperScreenshotMode: Bool {
        developerScreenshotPreset != nil
    }

    var pushNotificationsEnabled: Bool {
        pushNotificationsPreferenceEnabled &&
            ["authorized", "ephemeral", "provisional"].contains(pushAuthorizationStatus)
    }

    var shouldShowPushPrompt: Bool {
        guard pushAuthorizationStatus != "unsupported" else {
            return false
        }

        if pushNotificationsPreferenceEnabled {
            return !pushNotificationsEnabled
        }

        return !pushNotificationsPreferenceConfigured
    }

    var pushPermissionButtonTitle: String {
        pushAuthorizationStatus == "denied" && pushNotificationsPreferenceEnabled ? "Open Settings" : "Allow notifications"
    }

    var homePushPromptTitle: String {
        if pushAuthorizationStatus == "denied" && pushNotificationsPreferenceEnabled {
            return "The daily word is waiting outside"
        }

        return "Let the daily word find you"
    }

    var homePushPromptMessage: String {
        if pushAuthorizationStatus == "denied" && pushNotificationsPreferenceEnabled {
            return "iOS has notifications barred in Settings. Reopen the door there if you want the daily word sent here."
        }

        return "One entry a day, at the hour you choose. This device keeps the next stretch queued locally. Useful correspondence, not a campaign."
    }

    var homePushPromptButtonTitle: String? {
        guard pushAuthorizationStatus != "unsupported" else {
            return nil
        }

        if pushAuthorizationStatus == "denied" && pushNotificationsPreferenceEnabled {
            return "Open Settings"
        }

        return "Send the daily word"
    }

    var pushPreferredDeliveryHourLabel: String {
        Self.pushDeliveryHourLabel(for: pushPreferredDeliveryHour)
    }

    var pushStatusMessage: String {
        if pushAuthorizationStatus == "unsupported" {
            return "On-device daily notifications are not wired for this Apple edition yet."
        }

        if !pushNotificationsPreferenceEnabled {
            return pushNotificationsPreferenceConfigured
                ? "This device is off the daily-word list."
                : "Pick an hour and this device will queue the next 60 daily words locally."
        }

        switch pushAuthorizationStatus {
        case "authorized":
            if let pushNextScheduledFireAt, pushScheduledNotificationCount > 0 {
                return "This device has \(pushScheduledNotificationCount) daily words queued locally. The next one lands at \(nativeFormattedDate(pushNextScheduledFireAt))."
            }

            return "Notifications are allowed. Open the app once to rebuild the on-device queue."
        case "denied":
            return "The app can queue daily words locally, but iOS barred the door in Settings."
        case "ephemeral":
            return "The daily word queue is local to this device and will keep \(pushPreferredDeliveryHourLabel) so long as this permission remains on speaking terms."
        case "provisional":
            return "The daily word queue is local to this device, arriving quietly at \(pushPreferredDeliveryHourLabel) local time."
        case "notDetermined":
            return "When iOS asks, allow notifications and the app will queue the next 60 daily words on this device."
        default:
            return "Notifications are wired locally, but iOS has not yet produced a final answer."
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

    var pushScheduleStatusMessage: String {
        if pushAuthorizationStatus == "unsupported" {
            return "Local notification scheduling is not enabled for this Apple platform."
        }

        if let pushScheduledCatalogVersion {
            return "Built from on-device catalogue \(pushScheduledCatalogVersion) for \(pushScheduledTimeZone). No APNs token or backend lease is involved."
        }

        return "Open the app with notifications enabled to rebuild the on-device queue from the local catalogue."
    }

    var pushScheduledNotificationCountLabel: String {
        pushScheduledNotificationCount == 0 ? "None queued" : "\(pushScheduledNotificationCount) queued"
    }

    var pushNextScheduledFireLabel: String {
        guard let pushNextScheduledFireAt else {
            return "Not scheduled"
        }

        return nativeFormattedDate(pushNextScheduledFireAt)
    }

    var pushScheduledCatalogVersionLabel: String {
        pushScheduledCatalogVersion ?? "Unavailable"
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
        if !slug.isEmpty, let match = entry(slug: slug) {
            return match
        }

        let lowercased = trimmed.lowercased()
        return entries.first { candidate in
            candidate.title.lowercased() == lowercased ||
                candidate.aliases.contains(where: { $0.lowercased() == lowercased })
        }
    }

    func showSeeAlsoResults(for label: String) {
        let trimmed = label.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            return
        }

        resetSearchFilters()
        searchQuery = trimmed
        showSection(.search)
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

        routeToEntry(slug: slug)
        reviewManager.recordEntryOpenIfEligible()
    }

    private func routeToEntry(slug: String) {
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

    func completeOnboarding(openGuide: Bool = false) {
        savedWordsStorage.saveHasCompletedOnboarding(true)

        if openGuide {
            presentGuide()
        } else {
            dismissSheet()
        }
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
        let record = SavedWordRecord(entry: entry, savedAt: Self.timestamp())
        persistSavedWord(record)
        scheduleSavedWordsSyncIfNeeded()
    }

    func openSavedPlace() {
        guard let savedWord = savedWords.first else {
            showSection(.search)
            return
        }

        if let entry = entry(slug: savedWord.slug) {
            presentEntry(entry)
        } else {
            showSection(.search)
        }
    }

    func clearSavedPlace() {
        clearSavedWords()
    }

    func clearSavedWords() {
        savedWordsStorage.saveSavedWords([])
        savedWords = []
        scheduleSavedWordsSyncIfNeeded()
    }

    func removeSavedWord(_ savedWord: SavedWordRecord) {
        let updated = savedWords.filter { $0.slug != savedWord.slug }
        guard updated.count != savedWords.count else {
            return
        }

        persistSavedWords(updated)
        scheduleSavedWordsSyncIfNeeded()
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

    func shareImageURL(for entry: Entry) -> URL? {
        shareURL(for: entry)?.appendingPathComponent("opengraph-image")
    }

    func shareText(for entry: Entry) -> String {
        let title = entry.title.trimmingCharacters(in: .whitespacesAndNewlines)
        let summary = entry.devilDefinition.trimmingCharacters(in: .whitespacesAndNewlines)
        let url = shareURL(for: entry)?.absoluteString ?? "https://thedevilsaidictionary.com\(entry.url)"

        return [title, summary, url]
            .filter { !$0.isEmpty }
            .joined(separator: "\n\n")
    }

    func refreshCurrentWord() {
        _ = manager.refreshCurrentWord()
        refreshFromManager()
    }

    func checkLiveCatalogIfNeeded() async {
        guard !NativeLaunchConfiguration.isUITesting else {
            return
        }

        guard liveCatalogManifest == nil, liveCatalogCheckedAt == nil, liveCatalogError == nil else {
            return
        }

        await checkLiveCatalog()
    }

    func checkLiveCatalog() async {
        guard !NativeLaunchConfiguration.isUITesting else {
            return
        }

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
        await manager.handleNotificationResponse(userInfo: [
            "slug": trimmedSlug,
            "source": CurrentWordSource.localNotification.rawValue,
        ])
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
        await setPushNotificationsEnabled(true)
    }

    func setPushNotificationsEnabled(_ enabled: Bool) async {
        let wasDenied = pushAuthorizationStatus == "denied"

        do {
            _ = try await manager.setPushNotificationsEnabled(enabled)
            actionError = nil
            refreshFromManager()

            if enabled && wasDenied {
                openSystemSettings()
            }
        } catch {
            actionError = error.localizedDescription
        }
    }

    func setPushPreferredDeliveryHour(_ hour: Int) async {
        _ = await manager.setPushPreferredDeliveryHour(hour)
        actionError = nil
        refreshFromManager()
    }

    func refreshAppleAccountState() async {
        guard !NativeLaunchConfiguration.isUITesting else {
            appleSession = nil
            persistSavedWords(savedWordsStorage.loadSavedWords(), showsToast: false)
            savedWordsSyncError = nil
            return
        }

        #if os(iOS)
        if appleSession != nil && hasPendingSavedWordsSync {
            await flushPendingSavedWordsSync()
        }

        do {
            let session = try await appleBackendClient.fetchSession()
            appleSession = session

            if let session {
                if let displayName = session.displayName, !displayName.isEmpty,
                   appleAccountIdentity?.name != displayName || appleAccountIdentity?.email != session.email {
                    let updatedIdentity = AppleAccountIdentity(
                        userIdentifier: appleAccountIdentity?.userIdentifier ?? "",
                        name: displayName,
                        email: session.email
                    )
                    appleAccountIdentity = updatedIdentity
                    savedWordsStorage.saveAppleAccountIdentity(updatedIdentity)
                }

                do {
                    let remoteSavedWords = try await appleBackendClient.fetchSavedWords()
                    persistSavedWords(
                        Self.mergeSavedWords(savedWordsStorage.loadSavedWords(), remoteSavedWords),
                        showsToast: false
                    )
                    savedWordsSyncError = nil
                    if let lastSyncedAt = session.lastSyncedAt,
                       let parsedDate = SharedDateParser.iso8601.date(from: lastSyncedAt) {
                        lastSavedWordsSyncAt = parsedDate
                    }
                } catch {
                    savedWordsSyncError = error.localizedDescription
                    if savedWords.isEmpty {
                        persistSavedWords(savedWordsStorage.loadSavedWords(), showsToast: false)
                    }
                }
            } else {
                persistSavedWords(savedWordsStorage.loadSavedWords(), showsToast: false)
                savedWordsSyncError = nil
            }
        } catch {
            savedWordsSyncError = error.localizedDescription
            persistSavedWords(savedWordsStorage.loadSavedWords(), showsToast: false)
        }
        #else
        appleSession = nil
        persistSavedWords(savedWordsStorage.loadSavedWords(), showsToast: false)
        savedWordsSyncError = nil
        #endif
    }

    func completeAppleSignIn(
        authorizationCode: String,
        identityToken: String?,
        userIdentifier: String,
        name: String?,
        email: String?
    ) async {
        #if os(iOS)
        let existingIdentity = appleAccountIdentity
        let trimmedName = name?.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedEmail = email?.trimmingCharacters(in: .whitespacesAndNewlines)
        let normalizedName = trimmedName?.isEmpty == false ? trimmedName : existingIdentity?.name
        let normalizedEmail = trimmedEmail?.isEmpty == false ? trimmedEmail : existingIdentity?.email
        let identity = AppleAccountIdentity(
            userIdentifier: userIdentifier,
            name: normalizedName,
            email: normalizedEmail
        )

        appleAccountIdentity = identity
        savedWordsStorage.saveAppleAccountIdentity(identity)
        let localSavedWords = savedWords

        do {
            try await appleBackendClient.exchangeAuthorizationCode(
                authorizationCode: authorizationCode,
                identityToken: identityToken,
                userIdentifier: userIdentifier,
                name: normalizedName,
                email: normalizedEmail
            )
            savedWordsSyncError = nil
            await syncLocalSavedWordsToBackend(localSavedWords)
            await refreshAppleAccountState()
        } catch {
            savedWordsSyncError = error.localizedDescription
        }
        #endif
    }

    #if os(iOS)
    func handleAppleSignIn(_ result: Result<ASAuthorization, Error>) async {
        switch result {
        case .success(let authorization):
            guard
                let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                let authorizationCodeData = credential.authorizationCode,
                let authorizationCode = String(data: authorizationCodeData, encoding: .utf8)
            else {
                actionError = "Apple did not hand over a usable authorization code."
                return
            }
            let identityToken = credential.identityToken.flatMap { String(data: $0, encoding: .utf8) }

            let givenName = credential.fullName?.givenName?.trimmingCharacters(in: .whitespacesAndNewlines)
            let familyName = credential.fullName?.familyName?.trimmingCharacters(in: .whitespacesAndNewlines)
            let nameParts = [givenName, familyName].compactMap { value -> String? in
                guard let value, !value.isEmpty else { return nil }
                return value
            }
            let name = nameParts.isEmpty ? nil : nameParts.joined(separator: " ")

            await completeAppleSignIn(
                authorizationCode: authorizationCode,
                identityToken: identityToken,
                userIdentifier: credential.user,
                name: name,
                email: credential.email
            )
        case .failure(let error):
            savedWordsSyncError = error.localizedDescription
        }
    }
    #endif

    func signOutOfApple() async {
        #if os(iOS)
        pendingSavedWordsSyncTask?.cancel()
        pendingSavedWordsSyncTask = nil
        hasPendingSavedWordsSync = false

        do {
            try await appleBackendClient.signOut()
            savedWordsSyncError = nil
        } catch {
            savedWordsSyncError = error.localizedDescription
            appleBackendClient.clearSessionToken()
        }

        appleSession = nil
        appleAccountIdentity = nil
        lastSavedWordsSyncAt = nil
        savedWordsStorage.saveAppleAccountIdentity(nil)
        persistSavedWords(savedWordsStorage.loadSavedWords(), showsToast: false)
        #endif
    }

    func refreshSavedWordsSyncState() async {
        guard !isRefreshingSavedWordsSync else {
            return
        }

        isRefreshingSavedWordsSync = true
        defer { isRefreshingSavedWordsSync = false }

        if hasPendingSavedWordsSync {
            await flushPendingSavedWordsSync()
        }

        await refreshAppleAccountState()
    }

    private func syncLocalSavedWordsToBackend(_ localSavedWords: [SavedWordRecord]? = nil) async {
        guard appleSession != nil || localSavedWords != nil else {
            return
        }

        let desiredWords = (localSavedWords ?? savedWords).sorted(by: { $0.savedAt > $1.savedAt })

        guard !desiredWords.isEmpty else {
            await refreshAppleAccountState()
            return
        }

        do {
            let snapshot = try await appleBackendClient.upsertSavedWords(desiredWords)
            applySavedWordsSyncSnapshot(snapshot, desiredWords: desiredWords)
            savedWordsSyncError = nil
        } catch {
            savedWordsSyncError = error.localizedDescription
            return
        }

        await refreshAppleAccountState()
    }

    private func scheduleSavedWordsSyncIfNeeded() {
        #if os(iOS)
        guard appleSession != nil else {
            return
        }

        pendingSavedWordsSyncTask?.cancel()
        hasPendingSavedWordsSync = true
        savedWordsSyncError = nil

        pendingSavedWordsSyncTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            guard !Task.isCancelled else {
                return
            }

            await self?.flushPendingSavedWordsSync()
        }
        #endif
    }

    private func flushPendingSavedWordsSync() async {
        #if os(iOS)
        guard appleSession != nil else {
            hasPendingSavedWordsSync = false
            pendingSavedWordsSyncTask?.cancel()
            pendingSavedWordsSyncTask = nil
            return
        }

        pendingSavedWordsSyncTask?.cancel()
        pendingSavedWordsSyncTask = nil

        let desiredWords = savedWordsStorage.loadSavedWords().sorted(by: { $0.savedAt > $1.savedAt })

        do {
            let snapshot = try await appleBackendClient.replaceSavedWords(desiredWords)
            hasPendingSavedWordsSync = false
            savedWordsSyncError = nil
            applySavedWordsSyncSnapshot(snapshot, desiredWords: desiredWords)
        } catch {
            hasPendingSavedWordsSync = true
            savedWordsSyncError = error.localizedDescription
        }
        #endif
    }

    private func applySavedWordsSyncSnapshot(
        _ snapshot: NativeSavedWordsSyncSnapshot,
        desiredWords: [SavedWordRecord]
    ) {
        let syncedWords = snapshot.savedWords.isEmpty && desiredWords.isEmpty
            ? []
            : (snapshot.savedWords.isEmpty ? desiredWords : snapshot.savedWords)
        let sortedWords = syncedWords.sorted(by: { $0.savedAt > $1.savedAt })

        persistSavedWords(sortedWords, showsToast: false)

        let syncedAt = snapshot.lastSyncedAt
            .flatMap { SharedDateParser.iso8601.date(from: $0) ?? SharedDateParser.calendar.date(from: $0) }
            ?? Date()
        lastSavedWordsSyncAt = syncedAt

        if let session = appleSession {
            appleSession = NativeAppleSessionState(
                isAuthenticated: session.isAuthenticated,
                displayName: session.displayName,
                email: session.email,
                lastSyncedAt: snapshot.lastSyncedAt ?? SharedDateFormatter.iso8601.string(from: syncedAt),
                savedWordCount: snapshot.savedWordCount ?? sortedWords.count
            )
        }
    }

    func handlePushPermissionAction() async {
        guard pushAuthorizationStatus == "denied" && pushNotificationsPreferenceEnabled else {
            await setPushNotificationsEnabled(true)
            return
        }

        actionError = nil
        openSystemSettings()
    }

    var reviewStatusMessage: String {
        reviewManager.statusMessage
    }

    var reviewActionTitle: String {
        reviewManager.manualReviewActionTitle
    }

    var canReviewApp: Bool {
        reviewManager.canOpenManualReview
    }

    func openAppReviewPage() {
        reviewManager.openManualReviewPage()
    }

    func syncDeveloperScreenshotModeFromDefaults() {
        let defaults = UserDefaults.standard
        let isDeveloperModeEnabled = NativeDeveloperModeAvailability.isEnabled(defaults: defaults)

        guard isDeveloperModeEnabled,
              let rawValue = defaults.string(forKey: NativeDeveloperModeAvailability.screenshotPresetKey),
              let preset = DeveloperScreenshotPreset(rawValue: rawValue)
        else {
            developerScreenshotPreset = nil
            pendingDeveloperScreenshotPreset = nil
            return
        }

        if developerScreenshotPreset == preset && pendingDeveloperScreenshotPreset == nil {
            return
        }

        developerScreenshotPreset = preset
        pendingDeveloperScreenshotPreset = preset
        applyPendingDeveloperScreenshotPresetIfPossible()
    }

    func applyDeveloperScreenshotPreset(_ preset: DeveloperScreenshotPreset, persistSelection: Bool = true) {
        if persistSelection {
            UserDefaults.standard.set(preset.rawValue, forKey: NativeDeveloperModeAvailability.screenshotPresetKey)
        }

        developerScreenshotPreset = preset
        pendingDeveloperScreenshotPreset = preset
        applyPendingDeveloperScreenshotPresetIfPossible()
    }

    func clearDeveloperScreenshotPreset(persistSelection: Bool = true) {
        if persistSelection {
            UserDefaults.standard.removeObject(forKey: NativeDeveloperModeAvailability.screenshotPresetKey)
        }

        developerScreenshotPreset = nil
        pendingDeveloperScreenshotPreset = nil
    }

    private func persistSavedWord(_ record: SavedWordRecord, showsToast: Bool = true) {
        var updated = savedWords.filter { $0.slug != record.slug }
        updated.insert(record, at: 0)
        persistSavedWords(updated, showsToast: showsToast)
    }

    private func persistSavedWords(_ records: [SavedWordRecord], showsToast: Bool = true) {
        let sorted = records.sorted(by: { $0.savedAt > $1.savedAt })
        savedWordsStorage.saveSavedWords(sorted)
        savedWords = sorted

        if showsToast {
            showSavedToast("Saved to your words list.")
        }
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
        if !NativeLaunchConfiguration.isUITesting {
            await PhoneCatalogManager.shared.refreshIfNeeded()
            await manager.refreshDiagnosticsState()
            await refreshAppleAccountState()
        }

        reviewManager.recordForegroundActivation()
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
        pushNotificationsPreferenceEnabled =
            state["pushNotificationsPreferenceEnabled"] as? Bool ?? false
        pushNotificationsPreferenceConfigured =
            state["pushNotificationsPreferenceConfigured"] as? Bool ?? false
        pushPreferredDeliveryHour =
            state["pushPreferredDeliveryHour"] as? Int ?? CurrentWordStorage.defaultPushPreferredDeliveryHour
        pushScheduledNotificationCount = state["pushScheduledNotificationCount"] as? Int ?? 0
        pushScheduledCatalogVersion = state["pushScheduledCatalogVersion"] as? String
        pushScheduledTimeZone = state["pushScheduledTimeZone"] as? String ?? TimeZone.current.identifier
        pushNextScheduledFireAt = state["pushNextScheduledFireAt"] as? Date
        catalogVersion = state["catalogVersion"] as? String ?? catalogSnapshot?.version
        lastCatalogCheckAt = CatalogDiskStore().loadLastCheckAt()
        isRefreshingCatalog = PhoneCatalogManager.shared.isRefreshing

        if let path = state["pendingNavigationPath"] as? String {
            consumePendingNavigation(path: path)
        }

        applyPendingDeveloperScreenshotPresetIfPossible()
    }

    private func consumePendingNavigation(path: String) {
        switch resolvePendingDictionaryNavigation(
            path: path,
            hasLoadedCatalog: catalogSnapshot != nil,
            hasLoadError: loadError != nil
        ) {
        case .clearPendingPath:
            manager.consumePendingNavigationPath(path)
        case .waitForCatalog:
            return
        case .routeToEntry(let slug):
            showSection(.search)
            routeToEntry(slug: slug)
            manager.consumePendingNavigationPath(path)
        }
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

    private static func timestamp() -> String {
        SharedDateFormatter.iso8601.string(from: Date())
    }

    private func applyPendingDeveloperScreenshotPresetIfPossible() {
        guard let preset = pendingDeveloperScreenshotPreset,
              catalogSnapshot != nil else {
            return
        }

        stageDeveloperScreenshotState(for: preset)
        pendingDeveloperScreenshotPreset = nil
    }

    private func stageDeveloperScreenshotState(for preset: DeveloperScreenshotPreset) {
        dismissSavedToast()
        actionError = nil
        activeSheet = nil
        searchQuery = ""
        resetSearchFilters()

        switch preset {
        case .home:
            showSection(.home)
        case .search:
            showSection(.search)
            searchQuery = "agent"
        case .categories:
            showSection(.categories)
        case .saved:
            showSection(.saved)

            if let entry = preferredDeveloperScreenshotEntry(
                candidates: ["clanker", "agentic-ai", "agent", "prompt-injection"]
            ) {
                let record = SavedWordRecord(entry: entry, savedAt: Self.timestamp())
                persistSavedWord(record, showsToast: false)
            }
        case .entry:
            showSection(.home)

            if let entry = preferredDeveloperScreenshotEntry(
                candidates: ["agentic-ai", "clanker", "prompt-injection", "rag"]
            ) {
                routeToEntry(slug: entry.slug)
            }
        }
    }

    private func preferredDeveloperScreenshotEntry(candidates: [String]) -> Entry? {
        for slug in candidates {
            if let match = entry(slug: slug) {
                return match
            }
        }

        return todayWord ?? recentEntries.first ?? entries.first
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

    private static func pushDeliveryHourLabel(for hour: Int) -> String {
        String(format: "%02d:00", min(max(hour, 0), 23))
    }

    private static func mergeSavedWords(
        _ localWords: [SavedWordRecord],
        _ remoteWords: [SavedWordRecord]
    ) -> [SavedWordRecord] {
        var mergedBySlug: [String: SavedWordRecord] = [:]

        for word in localWords + remoteWords {
            if let existing = mergedBySlug[word.slug] {
                mergedBySlug[word.slug] = word.savedAt >= existing.savedAt ? word : existing
            } else {
                mergedBySlug[word.slug] = word
            }
        }

        return mergedBySlug.values.sorted(by: { $0.savedAt > $1.savedAt })
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

func nativeFormattedDateTime(_ value: String) -> String {
    if let date = SharedDateParser.iso8601.date(from: value) {
        return SharedDateParser.dateTime.string(from: date)
    }

    if let date = SharedDateParser.calendar.date(from: value) {
        return SharedDateParser.dateTime.string(from: date)
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
    static let dateTime: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()
}

private final class NativeAppReviewManager {
    private enum Constants {
        static let minimumActiveDays = 5
        static let minimumEntryOpens = 12
        static let promptCooldown: TimeInterval = 180 * 24 * 60 * 60
        static let appStoreID = "6761293350"
    }

    private static let activeDayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone.current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private let storage: CurrentWordStorage

    init(storage: CurrentWordStorage = CurrentWordStorage()) {
        self.storage = storage
    }

    var canOpenManualReview: Bool {
        #if os(iOS)
        return Self.manualReviewURL != nil
        #else
        return false
        #endif
    }

    var manualReviewActionTitle: String {
        "Review it on the App Store"
    }

    var statusMessage: String {
        "After a respectable amount of reading, the app may ask for a review. It has the manners not to ask on launch."
    }

    func recordForegroundActivation(now: Date = .now) {
        let dayKey = Self.activeDayFormatter.string(from: now)
        guard storage.loadReviewLastActiveDay() != dayKey else {
            return
        }

        storage.saveReviewLastActiveDay(dayKey)
        storage.saveReviewActiveDayCount(storage.loadReviewActiveDayCount() + 1)
    }

    func recordEntryOpenIfEligible(now: Date = .now) {
        storage.saveReviewEntryOpenCount(storage.loadReviewEntryOpenCount() + 1)
        requestAutomaticReviewIfEligible(now: now)
    }

    func openManualReviewPage(now: Date = .now) {
        #if os(iOS)
        guard let url = Self.manualReviewURL else {
            return
        }

        markPromptAttempt(now: now)
        UIApplication.shared.open(url)
        #endif
    }

    private func requestAutomaticReviewIfEligible(now: Date) {
        guard shouldRequestReview(now: now) else {
            return
        }

        #if os(iOS)
        guard let scene = activeWindowScene() else {
            return
        }

        markPromptAttempt(now: now)
        SKStoreReviewController.requestReview(in: scene)
        #endif
    }

    private func shouldRequestReview(now: Date) -> Bool {
        guard storage.loadReviewActiveDayCount() >= Constants.minimumActiveDays else {
            return false
        }

        guard storage.loadReviewEntryOpenCount() >= Constants.minimumEntryOpens else {
            return false
        }

        if storage.loadReviewLastPromptedVersion() == Self.currentAppVersion {
            return false
        }

        if let lastPromptAt = storage.loadReviewLastPromptAt(),
           now.timeIntervalSince(lastPromptAt) < Constants.promptCooldown {
            return false
        }

        return true
    }

    private func markPromptAttempt(now: Date) {
        storage.saveReviewLastPromptAt(now)
        storage.saveReviewLastPromptedVersion(Self.currentAppVersion)
    }

    private static var currentAppVersion: String {
        (Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String) ?? "0"
    }

    #if os(iOS)
    private static var manualReviewURL: URL? {
        URL(string: "itms-apps://itunes.apple.com/app/id\(Constants.appStoreID)?action=write-review")
    }

    private func activeWindowScene() -> UIWindowScene? {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { scene in
                scene.activationState == .foregroundActive &&
                    scene.windows.contains(where: \.isKeyWindow)
            } ??
            UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .first { $0.activationState == .foregroundActive }
    }
    #endif
}
