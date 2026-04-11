import Foundation

#if canImport(DevilsAIDictionaryCore)
import DevilsAIDictionaryCore
#endif

struct CurrentWordStorage {
    private enum Keys {
        static let installationMarker = "installation-marker"
        static let currentWord = "current-word-record"
        static let pendingNavigationPath = "current-word-pending-navigation-path"
        static let pushDeviceToken = "current-word-push-device-token"
        static let pushNotificationsPreferenceEnabled = "push-notifications-preference-enabled"
        static let pushPreferredDeliveryHour = "push-preferred-delivery-hour"
        static let savedWords = "saved-words-records"
        static let appleAccountIdentity = "apple-account-identity"
        static let hasCompletedOnboarding = "has-completed-onboarding"
        static let reviewActiveDayCount = "review-active-day-count"
        static let reviewEntryOpenCount = "review-entry-open-count"
        static let reviewLastActiveDay = "review-last-active-day"
        static let reviewLastPromptAt = "review-last-prompt-at"
        static let reviewLastPromptedVersion = "review-last-prompted-version"
    }

    static let defaultPushPreferredDeliveryHour = 9

    let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    mutating func markInstallationIfNeeded() -> Bool {
        if defaults.string(forKey: Keys.installationMarker) != nil {
            return false
        }

        defaults.set(UUID().uuidString, forKey: Keys.installationMarker)
        return true
    }

    func loadCurrentWord() -> CurrentWordRecord? {
        decode(CurrentWordRecord.self, forKey: Keys.currentWord)
    }

    func saveCurrentWord(_ record: CurrentWordRecord) {
        encode(record, forKey: Keys.currentWord)
    }

    func loadPendingNavigationPath() -> String? {
        defaults.string(forKey: Keys.pendingNavigationPath)
    }

    func savePendingNavigationPath(_ path: String?) {
        defaults.set(path, forKey: Keys.pendingNavigationPath)
    }

    func loadPushDeviceToken() -> String? {
        defaults.string(forKey: Keys.pushDeviceToken)
    }

    func savePushDeviceToken(_ token: String?) {
        defaults.set(token, forKey: Keys.pushDeviceToken)
    }

    func loadPushNotificationsPreferenceEnabled() -> Bool? {
        guard defaults.object(forKey: Keys.pushNotificationsPreferenceEnabled) != nil else {
            return nil
        }

        return defaults.bool(forKey: Keys.pushNotificationsPreferenceEnabled)
    }

    func savePushNotificationsPreferenceEnabled(_ enabled: Bool?) {
        guard let enabled else {
            defaults.removeObject(forKey: Keys.pushNotificationsPreferenceEnabled)
            return
        }

        defaults.set(enabled, forKey: Keys.pushNotificationsPreferenceEnabled)
    }

    func loadPushPreferredDeliveryHour() -> Int {
        guard defaults.object(forKey: Keys.pushPreferredDeliveryHour) != nil else {
            return Self.defaultPushPreferredDeliveryHour
        }

        let storedHour = defaults.integer(forKey: Keys.pushPreferredDeliveryHour)
        return min(max(storedHour, 0), 23)
    }

    func savePushPreferredDeliveryHour(_ hour: Int) {
        defaults.set(min(max(hour, 0), 23), forKey: Keys.pushPreferredDeliveryHour)
    }

    func loadSavedWords() -> [SavedWordRecord] {
        if let words: [SavedWordRecord] = decode([SavedWordRecord].self, forKey: Keys.savedWords) {
            return words.sorted(by: savedWordSort)
        }

        if let legacyBookmark = decode(BookmarkRecord.self, forKey: "saved-reading-place"),
           let slug = slugFromDictionaryPath(legacyBookmark.href) {
            return [
                SavedWordRecord(
                    slug: slug,
                    href: legacyBookmark.href,
                    title: legacyBookmark.title,
                    description: legacyBookmark.description,
                    savedAt: legacyBookmark.savedAt
                )
            ]
        }

        return []
    }

    func saveSavedWords(_ words: [SavedWordRecord]) {
        let sorted = words.sorted(by: savedWordSort)
        encode(sorted, forKey: Keys.savedWords)
        defaults.removeObject(forKey: "saved-reading-place")
    }

    func loadAppleAccountIdentity() -> AppleAccountIdentity? {
        decode(AppleAccountIdentity.self, forKey: Keys.appleAccountIdentity)
    }

    func saveAppleAccountIdentity(_ identity: AppleAccountIdentity?) {
        guard let identity else {
            defaults.removeObject(forKey: Keys.appleAccountIdentity)
            return
        }

        encode(identity, forKey: Keys.appleAccountIdentity)
    }

    func loadHasCompletedOnboarding() -> Bool {
        defaults.bool(forKey: Keys.hasCompletedOnboarding)
    }

    func saveHasCompletedOnboarding(_ completed: Bool) {
        defaults.set(completed, forKey: Keys.hasCompletedOnboarding)
    }

    func loadReviewActiveDayCount() -> Int {
        defaults.integer(forKey: Keys.reviewActiveDayCount)
    }

    func saveReviewActiveDayCount(_ count: Int) {
        defaults.set(max(count, 0), forKey: Keys.reviewActiveDayCount)
    }

    func loadReviewEntryOpenCount() -> Int {
        defaults.integer(forKey: Keys.reviewEntryOpenCount)
    }

    func saveReviewEntryOpenCount(_ count: Int) {
        defaults.set(max(count, 0), forKey: Keys.reviewEntryOpenCount)
    }

    func loadReviewLastActiveDay() -> String? {
        defaults.string(forKey: Keys.reviewLastActiveDay)
    }

    func saveReviewLastActiveDay(_ value: String?) {
        defaults.set(value, forKey: Keys.reviewLastActiveDay)
    }

    func loadReviewLastPromptAt() -> Date? {
        defaults.object(forKey: Keys.reviewLastPromptAt) as? Date
    }

    func saveReviewLastPromptAt(_ date: Date?) {
        defaults.set(date, forKey: Keys.reviewLastPromptAt)
    }

    func loadReviewLastPromptedVersion() -> String? {
        defaults.string(forKey: Keys.reviewLastPromptedVersion)
    }

    func saveReviewLastPromptedVersion(_ version: String?) {
        defaults.set(version, forKey: Keys.reviewLastPromptedVersion)
    }

    private func decode<T: Decodable>(_ type: T.Type, forKey key: String) -> T? {
        guard let data = defaults.data(forKey: key) else {
            return nil
        }

        return try? JSONDecoder().decode(type, from: data)
    }

    private func encode<T: Encodable>(_ value: T, forKey key: String) {
        guard let data = try? JSONEncoder().encode(value) else {
            return
        }

        defaults.set(data, forKey: key)
    }

    private func savedWordSort(lhs: SavedWordRecord, rhs: SavedWordRecord) -> Bool {
        lhs.savedAt > rhs.savedAt
    }
}

struct AppleAccountIdentity: Codable, Equatable, Sendable {
    let userIdentifier: String
    let name: String?
    let email: String?
}
